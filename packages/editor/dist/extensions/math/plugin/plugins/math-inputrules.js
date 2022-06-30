/*---------------------------------------------------------
 *  Author: Benjamin R. Bray
 *  License: MIT (see LICENSE in project root for details)
 *--------------------------------------------------------*/
import { InputRule } from "prosemirror-inputrules";
import { NodeSelection } from "prosemirror-state";
////////////////////////////////////////////////////////////
// ---- Inline Input Rules ------------------------------ //
// simple input rule for inline math
export var REGEX_INLINE_MATH_DOLLARS = /\$\$(.+)\$\$/; //new RegExp("\$(.+)\$", "i");
// negative lookbehind regex notation allows for escaped \$ delimiters
// (requires browser supporting ECMA2018 standard -- currently only Chrome / FF)
// (see https://javascript.info/regexp-lookahead-lookbehind)
export var REGEX_INLINE_MATH_DOLLARS_ESCAPED = (function () {
    // attempt to create regex with negative lookbehind
    try {
        return new RegExp("(?<!\\\\)\\$(.+)(?<!\\\\)\\$");
    }
    catch (e) {
        return REGEX_INLINE_MATH_DOLLARS;
    }
})();
// ---- Block Input Rules ------------------------------- //
// simple inputrule for block math
export var REGEX_BLOCK_MATH_DOLLARS = /\$\$\$\s+$/; //new RegExp("\$\$\s+$", "i");
////////////////////////////////////////////////////////////
export function makeInlineMathInputRule(pattern, nodeType, getAttrs) {
    return new InputRule(pattern, function (state, match, start, end) {
        var $start = state.doc.resolve(start);
        var index = $start.index();
        var $end = state.doc.resolve(end);
        // get attrs
        var attrs = getAttrs instanceof Function ? getAttrs(match) : getAttrs;
        // check if replacement valid
        if (!$start.parent.canReplaceWith(index, $end.index(), nodeType)) {
            return null;
        }
        // perform replacement
        return state.tr.replaceRangeWith(start, end, nodeType.create(attrs, nodeType.schema.text(match[1])));
    });
}
export function makeBlockMathInputRule(pattern, nodeType, getAttrs) {
    return new InputRule(pattern, function (state, match, start, end) {
        var $start = state.doc.resolve(start);
        var attrs = getAttrs instanceof Function ? getAttrs(match) : getAttrs;
        if (!$start
            .node(-1)
            .canReplaceWith($start.index(-1), $start.indexAfter(-1), nodeType))
            return null;
        var tr = state.tr
            .delete(start, end)
            .setBlockType(start, start, nodeType, attrs);
        return tr.setSelection(NodeSelection.create(tr.doc, tr.mapping.map($start.pos - 1)));
    });
}
