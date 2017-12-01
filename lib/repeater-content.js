'use strict';

import { findUnescapedTokens, replaceRanges } from './utils';

/** Placeholder for inserted content */
const placeholder = '$#';

/** Placeholder for caret */
const caret = '|';

const reUrl = /^((?:https?|ftp|file):\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
const reEmail = /^([a-z0-9_\.-]+)@([\da-z\.-]+)\.([a-z\.]{2,6})$/;
const reProto = /^([a-z]+:)?\/\//i;

/**
 * Inserts content into node with implicit repeat count: this node is then
 * duplicated for each content item and content itself is inserted either into
 * deepest child or instead of a special token.
 *
 * This method uses two distinct steps: `prepare()` and `insert()` since most
 * likely these steps will be used separately to properly insert content
 * with unescaped `$` numbering markers.
 *
 * @param {Node} tree Parsed abbreviation
 * @param {String[]} content Array of content items to insert
 * @return {Node}
 */
export default function(tree, content) {
    if (typeof content === 'string') {
        content = [content];
    }

    if (Array.isArray(content) && content.length) {
        prepare(tree, content.length);
        insert(tree, content);
    }
    return tree;
}

/**
 * Finds nodes with implicit repeat and creates `amount` copies of it in tree
 * @param  {Node} tree
 * @param  {Number} amount
 * @return {Node}
 */
export function prepare(tree, amount) {
    amount = amount || 1;
    tree.walk(node => {
        if (node.repeat && node.repeat.count === null) {
            for (let i = 0; i < amount; i++) {
                const clone = node.clone(true);
                clone.repeat.implicit = true;
                clone.repeat.count = amount;
                clone.repeat.value = i + 1;
                clone.repeat.index = i;
                node.parent.insertBefore(clone, node);
            }

            node.remove();
        }
    });

    return tree;
}

/**
 * Inserts content into implicitly repeated nodes, created by `prepare()` method
 * @param  {Node} tree
 * @param  {String[]} content
 * @return {Node}
 */
export function insert(tree, content) {
    if (Array.isArray(content) && content.length) {
        let updated = false;
        tree.walk(node => {
            if (node.repeat && node.repeat.implicit) {
                updated = true;
                insertContent(node, content[node.repeat.index]);
            }
        });

        if (!updated) {
            // no node with implicit repeat was found, insert content as
            // deepest child
            setNodeContent(findDeepestNode(tree), content.join('\n'));
        }
    }

    return tree;
}

/**
 * Inserts `content` into given `node`: either replaces output placeholders
 * or inserts it into deepest child node
 * @param  {Node} node
 * @param  {String} content
 * @return {Node}
 */
function insertContent(node, content) {
	let inserted = insertContentIntoPlaceholder(node, content);
	node.walk(child => inserted |= insertContentIntoPlaceholder(child, content));

	if (!inserted) {
		// no placeholders were found in node, insert content into deepest child
		setNodeContent(findDeepestNode(node), content);
	}

	return node;
}

/**
 * Inserts given `content` into placeholders for given `node`. Placeholders
 * might be available in attribute values and node content
 * @param  {Node} node
 * @param  {String} content
 * @return {Boolean} Returns `true` if placeholders were found and replaced in node
 */
function insertContentIntoPlaceholder(node, content) {
	const state = {replaced: false};

	node.value = replacePlaceholder(node.value, content, state);
	node.attributes.forEach(attr => {
		if (attr.value) {
			node.setAttribute(attr.name, replacePlaceholder(attr.value, content, state));
		}
	});

	return state.replaced;
}

/**
 * Replaces all placeholder occurances in given `str` with `value`
 * @param  {String} str
 * @param  {String} value
 * @param  {Object} [_state] If provided, set `replaced` property of given
 * object to `true` if placeholder was found and replaced
 * @return {String}
 */
function replacePlaceholder(str, value, _state) {
	if (typeof str === 'string') {
		const ranges = findUnescapedTokens(str, placeholder);
		if (ranges.length) {
			if (_state) {
				_state.replaced = true;
			}

			str = replaceRanges(str, ranges, value);
		}
	}

	return str;
}

/**
 * Finds node which is the deepest for in current node or node iteself.
 * @param  {Node} node
 * @return {Node}
 */
function findDeepestNode(node) {
	while (node.children.length) {
		node = node.children[node.children.length - 1];
	}

	return node;
}

/**
 * Updates content of given node
 * @param {Node} node
 * @param {String} content
 */
function setNodeContent(node, content) {
	// find caret position and replace it with content, if possible
	if (node.value) {
		const ranges = findUnescapedTokens(node.value, caret);
		if (ranges.length) {
			node.value = replaceRanges(node.value, ranges, content);
			return;
		}
	}

	if (node.name.toLowerCase() === 'a' || node.hasAttribute('href')) {
		// special case: inserting content into `<a>` tag
		if (reUrl.test(content)) {
			node.setAttribute('href', (reProto.test(content) ? '' : 'http://') + content);
		} else if (reEmail.test(content)) {
			node.setAttribute('href', 'mailto:' + content);
		}
	}

	node.value = content;
}
