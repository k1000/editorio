mobwrite.shareCodeMirror = function( codemirror ) {
    mobwrite.shareObj.apply(this, [codemirror.id]);
    this.mergeChanges = true;
    this.editor = codemirror;
};

// The codemirror shared object's parent is a shareObj.
mobwrite.shareCodeMirror.prototype = new mobwrite.shareObj("");


/**
 * Retrieve the user's text.
 * @return {string} Plaintext content.
 */
mobwrite.shareCodeMirror.prototype.getClientText = function() {
  this.editor.lastCursor = this.editor.getCursor()
  return this.editor.getValue()
};

mobwrite.shareCodeMirror.prototype.setClientText = function(text) {
    this.editor.setValue(text);
    //this.fireChange(this.element);
    // restores position cursor back on the previous location
    this.editor.setCursor( this.editor.lastCursor );
};

mobwrite.ws = new io.Socket(window.location.hostname, {
      port:8011,
      resource:"mw",
      transports:['websocket', 'flashsocket','xhr-multipart', 'xhr-polling']
  }
);


mobwrite.shareCodeMirror.shareHandler = function(codemirror) {
    return new mobwrite.shareCodeMirror(codemirror);
};

mobwrite.shareHandlers.push(mobwrite.shareCodeMirror.shareHandler);

/**
 * Ovverwrites original method
 * Collect all client-side changes and send them to the server.
 * @private
 */
mobwrite.syncRun1_ = function() {
  // Initialize clientChange_, to be checked at the end of syncRun2_.
  mobwrite.clientChange_ = false;
  var data = [];
  data[0] = 'u:' + mobwrite.syncUsername + '\n';
  var empty = true;
  // Ask every shared object for their deltas.
  for (var x in mobwrite.shared) {
    if (mobwrite.shared.hasOwnProperty(x)) {
      if (mobwrite.nullifyAll) {
        data.push(mobwrite.shared[x].nullify());
      } else {
        data.push(mobwrite.shared[x].syncText());
      }
      empty = false;
    }
  }
  if (empty) {
    // No sync objects.
    if (mobwrite.debug) {
      window.console.info('MobWrite task stopped.');
    }
    return;
  }
  if (data.length == 1) {
    // No sync data.
    if (mobwrite.debug) {
      window.console.info('All objects silent; null sync.');
    }
    mobwrite.syncRun2_('\n\n');
    return;
  }

  var remote = (mobwrite.syncGateway.indexOf('://') != -1);
  if (mobwrite.debug) {
    window.console.info('TO server:\n' + data.join(''));
  }
  // Add terminating blank line.
  data.push('\n');
  data = data.join('');

 /*
  // Schedule a watchdog task to catch us if something horrible happens.
  mobwrite.syncKillPid_ =
      window.setTimeout(mobwrite.syncKill_, mobwrite.timeoutInterval);

  if (remote) {
    var blocks = mobwrite.splitBlocks_(data);
    // Add a script tag to the head.
    var head = document.getElementsByTagName('head')[0];
    for (var x = 0; x < blocks.length; x++) {
      var script = document.getElementById('mobwrite_sync' + x);
      if (script) {
        script.parentNode.removeChild(script);
        // IE allows us to recycle a script tag.
        // Other browsers need the old one destroyed and a new one created.
        if (!mobwrite.UA_msie) {
          // Browsers won't garbage collect the old script.
          // So castrate it to avoid a major memory leak.
          for (var prop in script) {
            delete script[prop];
          }
          script = null;
        }
      }
      if (!script) {
        script = document.createElement('script');
        script.type = 'text/javascript';
        script.charset = 'utf-8';
        script.id = 'mobwrite_sync' + x;
      }
      script.src = blocks[x];
      head.appendChild(script);
    }
    // Execution will resume in mobwrite.callback();
  } else {
    */
    // Issue Ajax post of client-side changes and request server-side changes.
    //data = 'q=' + encodeURIComponent(data);
    mobwrite.ws.send( {"mw": data, "res":x} );
  /*  mobwrite.syncAjaxObj_ = mobwrite.syncLoadAjax_(mobwrite.syncGateway, data,
        mobwrite.syncCheckAjax_);
    // Execution will resume in either syncCheckAjax_(), or syncKill_()
  }  */
};



mobwrite.ws.on('message', function( msg) { 
    mobwrite.syncRun2_(msg.mw + '\n');
  });
mobwrite.ws.on('connect', function( msg) {window.console.info( "connected")} );
mobwrite.ws.on('disconnect', function( msg) {window.console.info( "disconnected" )});


function connect( res ){
  if (!mobwrite.ws.connected){
    res.id = $("#res").val();
    mobwrite.ws.connect();
    mobwrite.debug=true;

    mobwrite.share(res);
  } 
}

