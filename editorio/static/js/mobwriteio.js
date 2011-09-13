mobwrite.shareCodeMirror = function( codemirror ) {
    mobwrite.shareObj.apply(this, [codemirror.id]);
    this.mergeChanges = true;
    this.editor = codemirror;
};

// The codemirror shared object's parent is a shareObj.
mobwrite.shareCodeMirror.prototype = new mobwrite.shareObj("");


mobwrite.SimpleDiffer = function() {
    this.chunks_ = [{start: 0,length: Infinity,type: "copy"}]
};
a = mobwrite.SimpleDiffer.prototype;
a.applyInsert = function(b, c) {
    var d = this.findChunk_(b), e = d[0];
    d = d[1];
    this.splitChunk_(e, d);
    e = e + 1;
    d = {type: "insert",text: c,length: c.length};
    this.chunks_.splice(e, 0, d)
};
a.applyDelete = function(b, c) {
    if (b != c) {
        var d = this.findChunk_(b), e = d[0];
        d = d[1];
        this.splitChunk_(e, d);
        e = e + 1;
        var f = this.findChunk_(c);
        d = f[0];
        f = f[1];
        this.splitChunk_(d, f);
        d = d + 1;
        this.chunks_.splice(e, d - e)
    }
};
a.splitChunk_ = function(b, c) {
    var d = this.chunks_[b], e = {length: d.length - c,type: d.type};
    d.length = c;
    if (d.type == "insert") {
        e.text = d.text.substr(c);
        d.text = d.text.substr(0, c)
    } else if (d.type == "copy")
        e.start = d.start + c;
    this.chunks_.splice(b + 1, 0, e)
};
a.findChunk_ = function(b) {
    var c = 0, d = 0;
    for (var e; e = this.chunks_[d]; d++) {
        if (c + e.length > b)
            return [d, b - c];
        c += e.length
    }
};
a.mergeInserts_ = function() {
    var b = null;
    for (var c = 0; c < this.chunks_.length; c++) {
        var d = this.chunks_[c];
        if (d.type == "insert")
            if (d.text == "")
                this.chunks_.splice(c, 1);
            else if (b) {
                b.text += d.text;
                b.length += d.length;
                this.chunks_.splice(c, 1);
                c--
            } else
                b = d;
        else
            b = null
    }
};
a.getSimpleDiff = function() {
    this.mergeInserts_();
    var b = [], c = Infinity;
    for (var d = this.chunks_.length - 1; d >= 0; d--) {
        var e = this.chunks_[d];
        if (e.type == "copy") {
            c = c - (e.start + e.length);
            c > 0 && b.push({type: "delete",start: e.start + e.length,end: e.start + e.length + c});
            c = e.start
        } else
            e.type == "insert" && b.push({type: "insert",start: c,text: e.text})
    }
    e = null;
    for (d = b.length - 1; d >= 0; d--) {
        c = b[d];
        if (c.type == "delete") {
            if (e)
                if (e.end == c.start) {
                    e.end = c.end;
                    b.splice(d, 1);
                    continue
                }
            e = c
        } else
            e = null
    }
    return b
};




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
mobwrite.shareCodeMirror.prototype.getBrOffsets_ = function(b, c) {
  c.sort(function(k, j) {
        return k - j
  });
  var d = {}, e = this.editor.lineCount(), f = e - 1, g = b.length;
  do
      for (g = b.lastIndexOf("\n", g - 1); g < c[c.length - 1]; ) {
          var h = c.pop(), i = f >= 0 ? e[f] || null : null;
          d[h] = {node: i,offset: i ? h - g - 1 : h};
          if (c.length == 0)
              break
      }
  while (g >= 0 && f-- >= 0);
  if (c.length) {
      if (c.pop() != 0)
          throw "Missing character indexes";
      d[0] = {node: null,offset: 0}
  }
  return d
};
mobwrite.shareCodeMirror.prototype.patchClientText = function(b) {
  this.dmp.Match_Distance = 1E3;
  this.dmp.Match_Threshold = 0.6;
  var c = this.getClientText(), d = new mobwrite.SimpleDiffer;
  b = this.patch_apply_(b, c, d);
  if (c != b) {
      d = d.getSimpleDiff();
      var e = [];
      b = 0;
      for (var f; f = d[b]; b++)
          if (f.type == "insert")
              e.push(f.start);
          else
              f.type == "delete" && e.push(f.start, f.end);
      c = this.getBrOffsets_(c, e);
      for (b = 0; f = d[b]; b++)
          if (f.type == "insert")
              this.editor.replaceRange(f.text, {line:0, ch:c[f.start]});
          else
              f.type == "delete" && this.editor.replaceRange("",  {line:0, ch:c[f.start]})
  }
};
mobwrite.shareCodeMirror.prototype.patch_apply_ = function(b, c, d) {
  if (b.length == 0)
      return c;
  b = this.dmp.patch_deepCopy(b);
  var e = this.dmp.patch_addPadding(b), f = e.length;
  c = e + c + e;
  this.dmp.patch_splitMax(b);
  var g = 0;
  for (var h = 0; h < b.length; h++) {
      var i = b[h].start2 + g, k = this.dmp.diff_text1(b[h].diffs), j, l = -1;
      if (k.length > this.dmp.Match_MaxBits) {
          j = this.dmp.match_main(c, k.substring(0, this.dmp.Match_MaxBits), i);
          if (j != -1) {
              l = this.dmp.match_main(c, k.substring(k.length - this.dmp.Match_MaxBits), i + k.length - this.dmp.Match_MaxBits);
              if (l == -1 || j >= l)
                  j = -1
          }
      } else
          j = 
          this.dmp.match_main(c, k, i);
      if (j == -1) {
          mobwrite.debug && window.console.warn("Patch failed: " + b[h]);
          g -= b[h].length2 - b[h].length1
      } else {
          mobwrite.debug && window.console.info("Patch OK.");
          g = j - i;
          i = l == -1 ? c.substring(j, j + k.length) : c.substring(j, l + this.dmp.Match_MaxBits);
          i = this.dmp.diff_main(k, i, false);
          if (k.length > this.dmp.Match_MaxBits && this.dmp.diff_levenshtein(i) / k.length > this.dmp.Patch_DeleteThreshold)
              mobwrite.debug && window.console.warn("Patch contents mismatch: " + b[h]);
          else {
              k = 0;
              var m;
              for (l = 0; l < b[h].diffs.length; l++) {
                  var n = 
                  b[h].diffs[l];
                  if (n[0] !== 0)
                      m = this.dmp.diff_xIndex(i, k);
                  if (n[0] === 1) {
                      c = c.substring(0, j + m) + n[1] + c.substring(j + m);
                      d.applyInsert(j + m - f, n[1])
                  } else if (n[0] === -1) {
                      var o = j + m, p = j + this.dmp.diff_xIndex(i, k + n[1].length);
                      c = c.substring(0, o) + c.substring(p);
                      d.applyDelete(o - e.length, p - e.length)
                  }
                  if (n[0] !== -1)
                      k += n[1].length
              }
          }
      }
  }
  return c = c.substring(e.length, c.length - e.length)
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

  mobwrite.ws.send( {"mw": data, "res":x} );
};


mobwrite.ws.on('message', function( msg) { 
    mobwrite.syncRun2_(msg.mw + '\n');
  });
mobwrite.ws.on('connect', function( msg) {window.console.info( "connected")} );
mobwrite.ws.on('disconnect', function( msg) {window.console.info( "disconnected" )});



function share( codemirror, resource ){
  if (!mobwrite.ws.connected){
    codemirror.id = resource;
    mobwrite.ws.connect();
    mobwrite.debug=true;
    mobwrite.share(codemirror);
  } 
}




