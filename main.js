(function (require) {
  var
  global,
  MSGS,
  stringifyAndPostFactory,
  stringifyAndPost,
  JSON,
  Worker,
  worker,
  usingFakeIDB,
  toEmscripten,
  commandsToRun = [],
  xxx;

  function doNothing() {

  }
  
  function messageHandler(e) {
    e = JSON.parse(e);
    
    switch(e.messageType) {
      case MSGS.IDB_STATUS: { //returns whether IndexedDB is available in the worker
        WorkerIDBStatusRecieved(e.data);
      } break;

      case MSGS.FAKE_IDB_UPDATED: { //the copy of the indexedDB in the worker is now synchronized
        workerIDBUpdated();
      } break;
      
      case MSGS.OUTPUT_TEXT: {   //output to console
        console.log(e.data);
      } break;
      
      case COMMAND_FINISHED: {   //the command we asked the worker to run has completed. store any file contents returned  into IndexedDB
        commandFinished(e.data);
      } break;
    }
  }
  
  function fromEmscripten(create, remove) {
    stringifyAndPost(MSGS.UPDATE_FAKE_IDB, {
      create: create
      remove: remove
    });
  }
  
  function toEmscriptenReciever(a) {
    toEmscripten = a;
  }
  
  function main(a, b, c) {
    global = a;
    JSON = global.JSON;
    Worker = global.Worker;
    MSGS = b;
    stringifyAndPostFactory = c;
  
    if(!Worker) {
      console.log("web workers not available in this web browser");
      return;
    }
    
    Module.FS.mkdir('/Documents');

    Module.FS.mount(Module.FS.filesystems.IDBWFS, {
      fromEmscripten:       fromEmscripten,
      toEmscriptenReciever: toEmscriptenReciever
    }, '/Documents');

    newWorker();
    
    Module.FS.syncfs(true, doNothing);    //indexeddb to local
  }
  
  function newWorker() {
    worker = new Worker('worker.js');
    
    stringifyAndPost = stringifyAndPostFactory(worker, JSON);
    worker.addEventListener('message', messageHandler, false);
  }

  function runCommand(commandLine) {
    commandsToRun.push(commandLine);
    
    if(!!usingFakeIDB !== usingFakeIDB) {   //only do this on page load. The worker might be terminated and replaced later though
      stringifyAndPost(MSGS.TEST_FOR_IDB, null);
      return;
    }
    
    continueRunCommand();
  }
  
  function workerIDBStatusRecieved(IDBAvailable) {
    //serialise the indexedDB data then send it to the worker in a message
    usingFakeIDB = IDBAvailable;
    
    continueRunCommand();
  }
  
  function continueRunCommand() {
    if (usingFakeIDB) {
      Module.FS.syncfs(3, doNothing); //local to worker message
    }
    else {
      workerIDBUpdated();
    }
  }
  
  function workerIDBUpdated() {
    stringifyAndPost(MSGS.RUN_COMMAND, commandsToRun.shift());
  }
  
  function commandFinished(data) {
    if(usingFakeIDB) {
      toEmscripten(false, data.created, data.removed);
      Module.FS.syncfs(3, persistLocal); //web worker to local
    }
  }
  
  function persistLocal() {
    Module.FS.syncfs(false, doNothing); //local to indexeddb and web worker
  }
  
  function terminateWorker() {
    worker.terminate();
    
    newWorker();
    
    if(usingFakeIDB) {
      toEmscripten(true); //reset the cache of web worker files
    }
  }

  require(['global','msgs', 'stringifyAndPost'], main);
})(require);
