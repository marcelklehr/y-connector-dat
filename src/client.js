function extend (Y) {
  class Connector extends Y.AbstractConnector {
    constructor (y, options) {
      if (options === undefined) {
        throw new Error('Options must not be undefined!')
      }
      if (options.dat == null) {
        throw new Error('You must define a dat API object!')
      }
      if (options.site == null) {
        throw new Error('You must define a dat site!')
      }
      options.role = 'slave'
      super(y, options)
      this.options = options
      this.dat = options.dat
      this.site = options.site
      this.setUserId(this.site.split('/')[2])
      this.collaborators = {}
      
      this.addCollaborator(this.userId)
      this.reconnect()
    }

    checkForUpdates() {
      return Promise.resolve()
      .then(() => this.updateCollaboratorsList())
      .then(() => Promise.all(
        Object.keys(this.collaborators).map(siteId => {
          return this.dat.stat('dat://'+siteId+'/')
          .then(stat => {
            if (true || stat.mtime > this.collaborators[siteId]) {
              //this.collaborators[siteId] = stat.mtime
              return this.pullDataFromCollaborator(siteId)
            }
          })
        })
      ))
    }

    pullDataFromCollaborator(id) {
      if (id == this.userId) return Promise.resolve()
      return Promise.resolve()
      .then(() => this.readCollaborators(id))
      .then(collabs => {
        return Promise.all(
          Object.keys(collabs)
          .filter(id => ~collabs[id])
          .map(id => this.dat.writeFile(this.site+'/collaborators/'+id, ''+collabs[id], 'utf8'))
        )
      })
      .then(() => Promise.all([
        this.dat.listFiles('dat://'+id+'/broadcast/')
      , this.dat.listFiles(this.site+'/broadcast/')
      ]))
      .then(msgs => {
        return Promise.all(
          Object.keys(msgs[0])
          .filter(msgid => !msgs[1][msgid])
          .map(msgid => this.dat.readFile('dat://'+id+'/broadcast/'+msgid).then((content) => [msgid, content]))
        )
      })
      .then(newMessages => {
        return Promise.all(
          newMessages
          .map(msg => {
            var [msgid, rawContent] = msg
            var [time, usrId] = msgid.split('-')
            if (usrId === id) {
              var content = JSON.parse(rawContent)
              if (content[0] === this.userId || !Array.isArray(content)){
                this.receiveMessage(usrId, content[1] || content)
              }
              return this.dat.writeFile(this.site+'/broadcast/'+msgid, '', 'utf8')
            }
            return Promise.resolve()
          })
        )
      })
    }
    
    readCollaborators(id) {
      return this.dat.listFiles('dat://'+id+'/collaborators')
      .then(dir => {
        return Promise.all(
          Object.keys(dir).map(collabid => this.dat.readFile('dat://'+id+'/collaborators/'+collabid).then(content => [collabid, parseInt(content)]))
        )
        .then(contents => {
          return contents.reduce((obj, c) => { obj[c[0]] = c[1]; return obj}, {})
        })
      })
    }

    updateCollaboratorsList() {
      return Promise.resolve()
      .then(() => this.readCollaborators(this.userId))
      .then((collaborators) => {
        Object.keys(this.collaborators)
        .filter(prevId => !~collaborators[prevId])
        .filter(id => id != this.userId)
        .forEach(id => this.userLeft(id))
        
        Object.keys(collaborators)
        .filter(newId => (~collaborators[newId] && !this.collaborators.hasOwnProperty(newId)))
        .filter(id => (id != this.userId))
        .forEach(id => this.userJoined(id, 'slave'))
        
        this.collaborators = Object.keys(collaborators)
        .filter(id => ~collaborators[id]) 
        .filter(id => id != this.userId)
        .reduce((obj, id) => {obj[id] = collaborators[id]; return obj}, {})
      })
    }

    addCollaborator(id) {
      return this.dat.writeFile(this.site+'/collaborators/'+id, '0', 'utf8')
    }
    
    removeCollaborator(id) {
      return this.dat.writeFile(this.site+'/collaborators/'+id, '-1', 'utf8')
    }

    disconnect () {
      this.connected = false
      super.disconnect()
    }
    
    destroy () {
      this.dat.deleteSite(this.site)
    }
    
    reconnect () {
      this.connected = true
      const loop = () => {
        if (!this.connected) return
        this.checkForUpdates()
        .then(
          () => setTimeout(loop, 5000)
        , (er) => {
            setTimeout(loop, 10000)
            console.log(er)
          }
        )
      }
      loop()
      super.reconnect()
    }
    
    send (uid, message) {
      this.broadcast([uid, message])
    }
    
    broadcast (message) {
      this.dat.writeFile(this.site+'/broadcast/'+(+new Date)+'-'+this.userId, JSON.stringify(message), 'utf8') 
    }
    
    isDisconnected () {
      return false
    }
  }
  Y.extend('connector-dat', Connector)
}

extend.create = function(dat, title) {
  return dat.createSite({title})
  .then(id => {
    return Promise.all([
      dat.createDirectory(id+'/broadcast')
    , dat.createDirectory(id+'/collaborators')
    ])
    .then(() => id)
  })
}

module.exports = extend
if (typeof Y !== 'undefined') {
  extend(Y)
}
