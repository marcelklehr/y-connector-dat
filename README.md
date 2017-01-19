# y-connector-dat
This is the amazing marriage of [y.js](https://github.com/y-js/yjs) and [dat](https://datproject.org) (specifically the dat API provided by [the beaker browser](https://beakerbrowser.com)).

## Details
[dat](https://datproject.org) is a private peer-to-peer gossip protocol that deals with versioned archives of files and directories.

[`y.js`](https://github.com/y-js/yjs) is a framework for building applications with CRDTs. Centralized services like Google Docs and Etherpad use OT, peer-to-peer applications use CRDT.

`y-connector-dat` is a transport abstraction layer for y.js that speaks with beaker's dat API.
Specifically, it embraces dat's concept of personal versioned archives and forking: Collaborator B forks the original archive, after having been sent its id. Then they send the id of their fork to the original author A, and A can choose to add them to their archive using the collaborator's id. Now, the archives can communicate by watching each other and A and B can collaborate using y.js. They can even choose to go seperate ways and remove each other from their rosters to stop receiving changes from each other.

## Install
`npm install --save y-connector-dat`

## Usage
```js
//...
require('y-connector-dat')(Y)
// ...

Y({
  db: {
    name: 'memory'
  },
  connector: {
    name: 'connector-dat'
  , dat: window.dat // the dat API to use (optional)
  , room: siteURL // id of the dat you have write access to (the user's own fork; if it' someone else's the doc will be read-only)
  },
  share: {
    textarea: 'Text' // or whatever you want
  }
}).then(function (y) {
  y.share.textarea.bind(document.getElementById('textfield'))

  // To add a collaborator
  y.connector.addCollaborator('<dat archive id without slashes>')
})

// To create a new document / dat archive
require('y-connector-dat')
.create(dat, '<Your dat archive title here>')
.then(/*...*/)
```

## Legal
(c) 2017 Marcel Klehr

MPL License
