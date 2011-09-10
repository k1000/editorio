    mobwrite.shareCodeMirror = function(b) {
        mobwrite.shareObj.apply(this, [b.id]);
        this.mergeChanges = true;
        this.editor = b
    };
    mobwrite.shareCodeMirror.prototype = new mobwrite.shareObj("");
    a = mobwrite.shareCodeMirror.prototype;
    a.getClientText = function() {
        var b = this.editor.editor.container;
        if ("innerText" in b)
            return b.innerText.replace(/\u00a0/g, " ").replace(/\u200b/g, "").replace(/\r/g, "");
        return this.editor.getCode()
    };
    a.setClientText = function(b) {
        this.editor.setCode(b)
    };
    a.getBrOffsets_ = function(b, c) {
        c.sort(function(k, j) {
            return k - j
        });
        var d = {}, e = this.editor.editor.container.getElementsByTagName("br"), f = e.length - 1, g = b.length;
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
    a.patchClientText = function(b) {
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
                    this.editor.editor.replaceRange(c[f.start], c[f.start], f.text);
                else
                    f.type == "delete" && this.editor.editor.replaceRange(c[f.start], 
                    c[f.end], "")
        }
    };
    a.patch_apply_ = function(b, c, d) {
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
    mobwrite.shareCodeMirror.shareHandler = function(b) {
        if (b instanceof CodeMirror)
            return new mobwrite.shareCodeMirror(b);
        return null
    };
    mobwrite.shareHandlers.push(mobwrite.shareCodeMirror.shareHandler);
    mobwrite.shareCodeMirror.create = function(b, c) {
        if (typeof b == "string")
            b = document.getElementById(b);
        if (!("content" in c))
            c.content = b.value;
        var d = document.createElement("DIV"), e = CodeMirror.replace(b);
        e(d);
        d = new CodeMirror(d, c);
        d.id = b.id || b.name;
        return d
    };
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