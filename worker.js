if(!require) { importScripts('extern/require-3.10.1.js'); }

(function(require) {
  var
  global,
  JSON,
  MSGS,
  currentMessageId = 0,
  usingFakeIDB;
  
  function messageHandler(e) { //set up the onmessage global function handler
    e = JSON.parse(e);

    switch(e.messageType) {
      case MSGS.TEST_FOR_IDB: {   //report whether IndexedDB is available in a web worker
        isIndexedDBAvailable();
      } break;
            
      case MSGS.UPDATE_FAKE_IDB: {   //update the fake indexedDB in the web worker with changes that have happened on the main thread
        updateFakeIndexedDB(false, e.data.version, e.data.files);
      } break;
      
      case MSGS.RUN_COMMAND: {   //run the specified command line, may post back changed file contents if IndexedDB doesn't work in a web worker
        runCommand(e.data.commandLine);
      }
    }
  }
  
  function main(a,b,c) {
    global = a;
    JSON = global.JSON;
    MSGS = b;
    stringifyAndPostFactory = c;
    stringifyAndPost;

    usingFakeIDB = !(global.indexedDB = global.indexedDB || global.mozIndexedDB || global.webkitIndexedDB || global.msIndexedDB),

    stringifyAndPost = stringifyAndPostFactory(global, JSON);
    global.onmessage = messageHandler;
  }

  function isIndexedDBAvailable() {
    stringifyAndPost(MSGS.IDB_STATUS, usingFakeIDB);
  }
  
  function updateFakeIndexedDB(init, version, data) {
    var i, len;
    
    Module.FS.syncfs(3, localPersisted); //web worker to local
  }

  function localPersisted() {
    stringifyAndPost(MSGS.FAKE_IDB_UPDATED, version);
  }
  
  function runCommand(commandLine) {
    var changedFiles;
    
    //do whatever emscripten wants us to do to run the program.
    
    if(usingFakeIDB) {
      //return the response code and contents of changed files
      stringifyAndPost(MSGS.COMMAND_FINISHED, changedFiles);
    }
    else {
      //if indexDB is functional in a web worker, then resync it then send the response code.
      //TODO make this a callback
      idbReSyncSuccess();
    }
  }
  
  function idbReSyncSuccess() {
    stringifyAndPost(MSGS.COMMAND_FINISHED);
  }
  
  //pseudo code thats called whenever stdout or strerr are flushed. the main thread will probably append this text to a pre tag or something like it
  function fflush(stream, text) {
    stringifyAndPost(MSGS.OUTPUT_TEXT, {
      stream: stream,
      text:   text
    });
  }

  require(['global','msgs', 'stringifyAndPost'], main);
})(require);
