


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
    ws.send( {"mw": data, "res":window.location.hostname} );
  /*  mobwrite.syncAjaxObj_ = mobwrite.syncLoadAjax_(mobwrite.syncGateway, data,
        mobwrite.syncCheckAjax_);
    // Execution will resume in either syncCheckAjax_(), or syncKill_()
  }  */
};


/**
* Retrieve the user's text.
* @return {string} Plaintext content.
*/
mobwrite.shareTextareaObj.prototype.getClientText = function() {
  if (!mobwrite.validNode_(this.element)) {
    mobwrite.unshare(this.file);
  }
  var text = mobwrite.shareTextareaObj.normalizeLinebreaks_(code_mirror.getValue());
  if (this.element.type == 'text') {
  // Numeric data should use overwrite mode.
  this.mergeChanges = !text.match(/^\s*-?[\d.,]+\s*$/);
  }
  // takes position of the cursor
  code_mirror.lastCursor = code_mirror.getCursor()
  return text;

};

/**
* Set the user's text.
* @param {string} text New text
*/
mobwrite.shareTextareaObj.prototype.setClientText = function(text) {
  code_mirror.setValue(text);
  this.fireChange(this.element);
  // restores position cursor back on the previous location
  code_mirror.setCursor( code_mirror.lastCursor );
};