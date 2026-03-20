(function() {
    'use strict';

    // ──────────────────────────────────────────────
    // Colors
    // ──────────────────────────────────────────────
    var COLORS = {
        darkNavy:   '#17223c',
        orange:     '#ea5b0c',
        peach:      '#FFE3CC',
        lightBlue:  '#E1EEFA',
        white:      '#ffffff',
        line:       '#17223c',
        hoverLine:  '#ea5b0c'
    };

    // ──────────────────────────────────────────────
    // Layout constants
    // ──────────────────────────────────────────────
    var CENTRAL_RADIUS         = 80;
    var BRANCH_DISTANCE        = 280;
    var ITEM_SPACING           = 36;
    var ITEM_OFFSET_FROM_BRANCH = 160;
    var BRANCH_NODE_RX         = 16;
    var BRANCH_NODE_PADDING    = 16;
    var ITEM_NODE_RX           = 10;
    var ITEM_NODE_PADDING      = 12;
    var BRANCH_IMAGE_SIZE      = 60;
    var CENTRAL_IMAGE_SIZE     = 120;

    // ──────────────────────────────────────────────
    // Init all containers on page
    // ──────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function() {
        var containers = document.querySelectorAll('.mindmap-container');
        for (var i = 0; i < containers.length; i++) {
            initMindmap(containers[i]);
        }
    });

    function initMindmap(container) {
        var dataAttr = container.getAttribute('data-mindmap');
        if (!dataAttr) return;

        var data;
        try {
            data = JSON.parse(dataAttr);
        } catch (e) {
            return;
        }

        var state = {
            data: data,
            container: container,
            svg: null,
            mainGroup: null,
            transform: { x: 0, y: 0, scale: 1 },
            dragging: false,
            dragStart: { x: 0, y: 0 },
            collapsed: {},       // branch index -> boolean
            branchPositions: [], // calculated positions for each branch
            itemPositions: [],   // calculated positions for each item
            popup: null
        };

        // All branches start expanded.
        if (data.branches) {
            for (var b = 0; b < data.branches.length; b++) {
                state.collapsed[b] = true; // start collapsed
            }
        }

        createSVG(state);
        render(state);
        bindInteractions(state);
    }

    // ──────────────────────────────────────────────
    // Create SVG element
    // ──────────────────────────────────────────────
    function createSVG(state) {
        state.container.innerHTML = '';
        state.container.style.position = 'relative';
        state.container.style.overflow = 'hidden';

        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.display = 'block';
        svg.style.cursor = 'grab';

        // Defs for filters / markers
        var defs = createSVGEl('defs');

        // Drop shadow filter
        var filter = createSVGEl('filter', { id: 'shadow', x: '-20%', y: '-20%', width: '140%', height: '140%' });
        var feGauss = createSVGEl('feGaussianBlur', { 'in': 'SourceAlpha', stdDeviation: '3' });
        var feOffset = createSVGEl('feOffset', { dx: '1', dy: '2', result: 'offsetblur' });
        var feFlood = createSVGEl('feFlood', { 'flood-color': 'rgba(0,0,0,0.15)' });
        var feComposite = createSVGEl('feComposite', { in2: 'offsetblur', operator: 'in' });
        var feMerge = createSVGEl('feMerge');
        feMerge.appendChild(createSVGEl('feMergeNode'));
        feMerge.appendChild(createSVGEl('feMergeNode', { 'in': 'SourceGraphic' }));
        filter.appendChild(feGauss);
        filter.appendChild(feOffset);
        filter.appendChild(feFlood);
        filter.appendChild(feComposite);
        filter.appendChild(feMerge);
        defs.appendChild(filter);

        svg.appendChild(defs);

        var mainGroup = createSVGEl('g', { 'class': 'mindmap-main' });
        svg.appendChild(mainGroup);

        state.svg = svg;
        state.mainGroup = mainGroup;
        state.container.appendChild(svg);

        // Create popup container (HTML overlay)
        var popupOverlay = document.createElement('div');
        popupOverlay.className = 'mindmap-popup-overlay';
        popupOverlay.style.display = 'none';
        state.container.appendChild(popupOverlay);
        state.popupOverlay = popupOverlay;
    }

    // ──────────────────────────────────────────────
    // Full render
    // ──────────────────────────────────────────────
    function render(state) {
        var g = state.mainGroup;
        g.innerHTML = '';

        var data = state.data;
        var cx = 0, cy = 0;

        // Calculate branch positions in a circle around center
        var branches = data.branches || [];
        var count = branches.length;
        state.branchPositions = [];
        state.itemPositions = [];

        for (var b = 0; b < count; b++) {
            var angle = (2 * Math.PI * b / count) - Math.PI / 2;
            var bx = cx + Math.cos(angle) * BRANCH_DISTANCE;
            var by = cy + Math.sin(angle) * BRANCH_DISTANCE;
            state.branchPositions.push({ x: bx, y: by, angle: angle });
        }

        // Draw connections first (behind nodes)
        var linesGroup = createSVGEl('g', { 'class': 'mindmap-lines' });
        g.appendChild(linesGroup);

        // Draw central-to-branch curves
        for (var b = 0; b < count; b++) {
            var bp = state.branchPositions[b];
            var path = createBezierPath(cx, cy, bp.x, bp.y);
            var line = createSVGEl('path', {
                d: path,
                stroke: COLORS.line,
                'stroke-width': '3',
                fill: 'none',
                'stroke-linecap': 'round',
                'class': 'mindmap-connection'
            });
            linesGroup.appendChild(line);
        }

        // Draw item connections and items for expanded branches
        for (var b = 0; b < count; b++) {
            if (state.collapsed[b]) continue;

            var branch = branches[b];
            var items = branch.items || [];
            var bp = state.branchPositions[b];
            var itemPosArr = [];

            // Determine which side the items should go on
            var angle = state.branchPositions[b].angle;
            var isRight = Math.cos(angle) >= 0;
            var isBottom = Math.sin(angle) >= 0;

            // Items spread out from branch node
            var totalHeight = (items.length - 1) * ITEM_SPACING;
            var startY = bp.y - totalHeight / 2;

            var itemDirX = isRight ? 1 : -1;

            for (var i = 0; i < items.length; i++) {
                var ix = bp.x + itemDirX * ITEM_OFFSET_FROM_BRANCH;
                var iy = startY + i * ITEM_SPACING;
                itemPosArr.push({ x: ix, y: iy });

                // Draw connection line
                var iPath = createBezierPath(bp.x, bp.y, ix, iy);
                var iLine = createSVGEl('path', {
                    d: iPath,
                    stroke: COLORS.line,
                    'stroke-width': '1.5',
                    fill: 'none',
                    'stroke-linecap': 'round',
                    opacity: '0.6',
                    'class': 'mindmap-connection-item'
                });
                linesGroup.appendChild(iLine);
            }

            state.itemPositions[b] = itemPosArr;
        }

        // Draw nodes on top of lines
        var nodesGroup = createSVGEl('g', { 'class': 'mindmap-nodes' });
        g.appendChild(nodesGroup);

        // Draw central topic
        drawCentralNode(nodesGroup, data.central, cx, cy);

        // Draw branch nodes
        for (var b = 0; b < count; b++) {
            var bp = state.branchPositions[b];
            drawBranchNode(nodesGroup, branches[b], bp.x, bp.y, b, state);
        }

        // Draw item nodes for expanded branches
        for (var b = 0; b < count; b++) {
            if (state.collapsed[b]) continue;

            var branch = branches[b];
            var items = branch.items || [];
            var positions = state.itemPositions[b] || [];

            for (var i = 0; i < items.length; i++) {
                if (positions[i]) {
                    drawItemNode(nodesGroup, items[i], positions[i].x, positions[i].y, b, i, state);
                }
            }
        }

        // Apply current transform
        applyTransform(state);

        // Center the view on first render
        if (!state._centered) {
            centerView(state);
            state._centered = true;
        }
    }

    // ──────────────────────────────────────────────
    // Bezier path between two points
    // ──────────────────────────────────────────────
    function createBezierPath(x1, y1, x2, y2) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        // Control points for smooth organic curve
        var cx1 = x1 + dx * 0.4;
        var cy1 = y1 + dy * 0.1;
        var cx2 = x1 + dx * 0.6;
        var cy2 = y1 + dy * 0.9;
        return 'M' + x1 + ',' + y1 + ' C' + cx1 + ',' + cy1 + ' ' + cx2 + ',' + cy2 + ' ' + x2 + ',' + y2;
    }

    // ──────────────────────────────────────────────
    // Draw central node
    // ──────────────────────────────────────────────
    function drawCentralNode(parent, central, cx, cy) {
        var group = createSVGEl('g', { 'class': 'mindmap-central', transform: 'translate(' + cx + ',' + cy + ')' });

        // Background circle
        var circle = createSVGEl('circle', {
            r: CENTRAL_RADIUS,
            fill: COLORS.orange,
            filter: 'url(#shadow)',
            'class': 'mindmap-central-bg'
        });
        group.appendChild(circle);

        var contentY = 0;

        // Image
        if (central.image_url) {
            var imgSize = CENTRAL_IMAGE_SIZE;
            var imgY = central.show_text ? -imgSize / 2 - 10 : -imgSize / 2;
            var img = createSVGEl('image', {
                href: central.image_url,
                x: -imgSize / 2,
                y: imgY,
                width: imgSize,
                height: imgSize,
                'clip-path': 'circle(' + (imgSize / 2) + 'px at ' + (imgSize / 2) + 'px ' + (imgSize / 2) + 'px)'
            });
            group.appendChild(img);
            contentY = imgY + imgSize + 5;
        }

        // Text
        if (central.show_text && central.text) {
            var textY = central.image_url ? contentY : 5;
            var text = createSVGEl('text', {
                x: 0,
                y: textY,
                'text-anchor': 'middle',
                'dominant-baseline': 'middle',
                fill: COLORS.white,
                'font-size': '16',
                'font-weight': 'bold',
                'class': 'mindmap-central-text'
            });
            text.textContent = central.text;
            group.appendChild(text);
        }

        parent.appendChild(group);
    }

    // ──────────────────────────────────────────────
    // Draw branch node (L2)
    // ──────────────────────────────────────────────
    function drawBranchNode(parent, branch, x, y, branchIdx, state) {
        var group = createSVGEl('g', {
            'class': 'mindmap-branch-node',
            transform: 'translate(' + x + ',' + y + ')',
            'data-branch': branchIdx
        });

        // Measure text to size the box
        var textStr = branch.text || '';
        var textWidth = measureText(textStr, 14);
        var hasImage = !!branch.image_url;

        var boxWidth = Math.max(textWidth + BRANCH_NODE_PADDING * 2, hasImage ? BRANCH_IMAGE_SIZE + BRANCH_NODE_PADDING * 2 : 80);
        var boxHeight = BRANCH_NODE_PADDING * 2 + 18 + (hasImage ? BRANCH_IMAGE_SIZE + 8 : 0);

        // Background rect
        var rect = createSVGEl('rect', {
            x: -boxWidth / 2,
            y: -boxHeight / 2,
            width: boxWidth,
            height: boxHeight,
            rx: BRANCH_NODE_RX,
            ry: BRANCH_NODE_RX,
            fill: COLORS.lightBlue,
            stroke: COLORS.darkNavy,
            'stroke-width': '2',
            filter: 'url(#shadow)',
            'class': 'mindmap-branch-bg'
        });
        group.appendChild(rect);

        var contentY = -boxHeight / 2 + BRANCH_NODE_PADDING;

        // Image above text
        if (hasImage) {
            var img = createSVGEl('image', {
                href: branch.image_url,
                x: -BRANCH_IMAGE_SIZE / 2,
                y: contentY,
                width: BRANCH_IMAGE_SIZE,
                height: BRANCH_IMAGE_SIZE
            });
            group.appendChild(img);
            contentY += BRANCH_IMAGE_SIZE + 8;
        }

        // Text
        if (textStr) {
            var text = createSVGEl('text', {
                x: 0,
                y: contentY + 9,
                'text-anchor': 'middle',
                'dominant-baseline': 'middle',
                fill: COLORS.darkNavy,
                'font-size': '14',
                'font-weight': '600',
                'class': 'mindmap-branch-text'
            });
            text.textContent = textStr;
            group.appendChild(text);
        }

        // Expand/collapse indicator
        var isCollapsed = state.collapsed[branchIdx];
        var items = branch.items || [];
        if (items.length > 0) {
            var indicatorR = 10;
            var indicatorY = boxHeight / 2 + indicatorR + 4;
            var indicatorCircle = createSVGEl('circle', {
                cx: 0,
                cy: indicatorY,
                r: indicatorR,
                fill: COLORS.darkNavy,
                'class': 'mindmap-expand-indicator'
            });
            group.appendChild(indicatorCircle);

            var indicatorText = createSVGEl('text', {
                x: 0,
                y: indicatorY + 1,
                'text-anchor': 'middle',
                'dominant-baseline': 'middle',
                fill: COLORS.white,
                'font-size': '12',
                'font-weight': 'bold'
            });
            indicatorText.textContent = isCollapsed ? '+' : '−';
            group.appendChild(indicatorText);
        }

        // Click to toggle
        group.style.cursor = 'pointer';
        group.addEventListener('click', function(e) {
            e.stopPropagation();
            state.collapsed[branchIdx] = !state.collapsed[branchIdx];
            render(state);
        });

        parent.appendChild(group);
    }

    // ──────────────────────────────────────────────
    // Draw item node (L3)
    // ──────────────────────────────────────────────
    function drawItemNode(parent, item, x, y, branchIdx, itemIdx, state) {
        var group = createSVGEl('g', {
            'class': 'mindmap-item-node',
            transform: 'translate(' + x + ',' + y + ')',
            'data-branch': branchIdx,
            'data-item': itemIdx
        });

        var textStr = item.text || '';
        var textWidth = measureText(textStr, 12);
        var boxWidth = textWidth + ITEM_NODE_PADDING * 2;
        var boxHeight = 28;

        var rect = createSVGEl('rect', {
            x: -boxWidth / 2,
            y: -boxHeight / 2,
            width: boxWidth,
            height: boxHeight,
            rx: ITEM_NODE_RX,
            ry: ITEM_NODE_RX,
            fill: COLORS.peach,
            stroke: COLORS.orange,
            'stroke-width': '1',
            'class': 'mindmap-item-bg'
        });
        group.appendChild(rect);

        var text = createSVGEl('text', {
            x: 0,
            y: 1,
            'text-anchor': 'middle',
            'dominant-baseline': 'middle',
            fill: COLORS.darkNavy,
            'font-size': '12',
            'class': 'mindmap-item-text'
        });
        text.textContent = textStr;
        group.appendChild(text);

        // Notes indicator
        if (item.notes && item.notes.length > 0) {
            var dotR = 5;
            group.style.cursor = 'pointer';
            var dot = createSVGEl('circle', {
                cx: boxWidth / 2 + dotR + 2,
                cy: -boxHeight / 2 + dotR,
                r: dotR,
                fill: COLORS.orange,
                'class': 'mindmap-note-indicator'
            });
            group.appendChild(dot);

            var dotText = createSVGEl('text', {
                x: boxWidth / 2 + dotR + 2,
                y: -boxHeight / 2 + dotR + 1,
                'text-anchor': 'middle',
                'dominant-baseline': 'middle',
                fill: COLORS.white,
                'font-size': '8',
                'font-weight': 'bold'
            });
            dotText.textContent = item.notes.length;
            group.appendChild(dotText);

            // Click to open popup
            group.addEventListener('click', function(e) {
                e.stopPropagation();
                openPopup(state, branchIdx, itemIdx, 0);
            });
        }

        parent.appendChild(group);
    }

    // ──────────────────────────────────────────────
    // Notes Popup
    // ──────────────────────────────────────────────
    function openPopup(state, branchIdx, itemIdx, noteIdx) {
        var branch = state.data.branches[branchIdx];
        var item = branch.items[itemIdx];
        var notes = item.notes || [];
        if (notes.length === 0) return;

        var overlay = state.popupOverlay;
        overlay.style.display = 'flex';

        var note = notes[noteIdx];
        var total = notes.length;

        // Find all items in the same branch for cross-item navigation context
        var itemTitle = item.text || 'Note';

        var html = '<div class="mindmap-popup">';
        html += '<div class="mindmap-popup-header">';
        html += '<span class="mindmap-popup-title">' + escapeHtml(itemTitle) + '</span>';
        html += '<button class="mindmap-popup-close" title="Close">&times;</button>';
        html += '</div>';
        html += '<div class="mindmap-popup-body">';
        if (note.text) {
            html += '<div class="mindmap-popup-text">' + escapeHtml(note.text).replace(/\n/g, '<br>') + '</div>';
        }
        if (note.image_url) {
            html += '<div class="mindmap-popup-image"><img src="' + escapeHtml(note.image_url) + '" alt="" /></div>';
        }
        html += '</div>';
        html += '<div class="mindmap-popup-nav">';
        html += '<button class="mindmap-popup-prev" ' + (noteIdx <= 0 ? 'disabled' : '') + '>&larr; Previous</button>';
        html += '<span class="mindmap-popup-counter">' + (noteIdx + 1) + ' / ' + total + '</span>';
        html += '<button class="mindmap-popup-next" ' + (noteIdx >= total - 1 ? 'disabled' : '') + '>Next &rarr;</button>';
        html += '</div>';
        html += '</div>';

        overlay.innerHTML = html;

        // Bind events
        overlay.querySelector('.mindmap-popup-close').addEventListener('click', function() {
            closePopup(state);
        });

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closePopup(state);
        });

        var prevBtn = overlay.querySelector('.mindmap-popup-prev');
        var nextBtn = overlay.querySelector('.mindmap-popup-next');

        if (prevBtn && noteIdx > 0) {
            prevBtn.addEventListener('click', function() {
                openPopup(state, branchIdx, itemIdx, noteIdx - 1);
            });
        }
        if (nextBtn && noteIdx < total - 1) {
            nextBtn.addEventListener('click', function() {
                openPopup(state, branchIdx, itemIdx, noteIdx + 1);
            });
        }

        // Keyboard navigation
        state._popupKeyHandler = function(e) {
            if (e.key === 'Escape') closePopup(state);
            if (e.key === 'ArrowLeft' && noteIdx > 0) openPopup(state, branchIdx, itemIdx, noteIdx - 1);
            if (e.key === 'ArrowRight' && noteIdx < total - 1) openPopup(state, branchIdx, itemIdx, noteIdx + 1);
        };
        document.addEventListener('keydown', state._popupKeyHandler);
    }

    function closePopup(state) {
        state.popupOverlay.style.display = 'none';
        state.popupOverlay.innerHTML = '';
        if (state._popupKeyHandler) {
            document.removeEventListener('keydown', state._popupKeyHandler);
            state._popupKeyHandler = null;
        }
    }

    // ──────────────────────────────────────────────
    // Pan & Zoom
    // ──────────────────────────────────────────────
    function bindInteractions(state) {
        var svg = state.svg;

        // Mouse drag to pan
        svg.addEventListener('mousedown', function(e) {
            if (e.target.closest('.mindmap-branch-node') || e.target.closest('.mindmap-item-node')) return;
            state.dragging = true;
            state.dragStart = { x: e.clientX - state.transform.x, y: e.clientY - state.transform.y };
            svg.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', function(e) {
            if (!state.dragging) return;
            state.transform.x = e.clientX - state.dragStart.x;
            state.transform.y = e.clientY - state.dragStart.y;
            applyTransform(state);
        });

        document.addEventListener('mouseup', function() {
            state.dragging = false;
            svg.style.cursor = 'grab';
        });

        // Touch drag to pan
        svg.addEventListener('touchstart', function(e) {
            if (e.touches.length !== 1) return;
            if (e.target.closest('.mindmap-branch-node') || e.target.closest('.mindmap-item-node')) return;
            state.dragging = true;
            state.dragStart = { x: e.touches[0].clientX - state.transform.x, y: e.touches[0].clientY - state.transform.y };
        }, { passive: true });

        document.addEventListener('touchmove', function(e) {
            if (!state.dragging || e.touches.length !== 1) return;
            state.transform.x = e.touches[0].clientX - state.dragStart.x;
            state.transform.y = e.touches[0].clientY - state.dragStart.y;
            applyTransform(state);
        }, { passive: true });

        document.addEventListener('touchend', function() {
            state.dragging = false;
        });

        // Wheel to zoom
        svg.addEventListener('wheel', function(e) {
            e.preventDefault();
            var rect = svg.getBoundingClientRect();
            var mouseX = e.clientX - rect.left;
            var mouseY = e.clientY - rect.top;

            var delta = e.deltaY > 0 ? 0.9 : 1.1;
            var newScale = Math.max(0.2, Math.min(3, state.transform.scale * delta));

            // Zoom toward cursor
            var factor = newScale / state.transform.scale;
            state.transform.x = mouseX - factor * (mouseX - state.transform.x);
            state.transform.y = mouseY - factor * (mouseY - state.transform.y);
            state.transform.scale = newScale;

            applyTransform(state);
        }, { passive: false });

        // Pinch to zoom (touch)
        var lastPinchDist = 0;
        svg.addEventListener('touchstart', function(e) {
            if (e.touches.length === 2) {
                lastPinchDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
            }
        }, { passive: true });

        svg.addEventListener('touchmove', function(e) {
            if (e.touches.length === 2) {
                var dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                if (lastPinchDist > 0) {
                    var factor = dist / lastPinchDist;
                    var newScale = Math.max(0.2, Math.min(3, state.transform.scale * factor));
                    state.transform.scale = newScale;
                    applyTransform(state);
                }
                lastPinchDist = dist;
                state.dragging = false;
            }
        }, { passive: true });
    }

    function applyTransform(state) {
        var t = state.transform;
        state.mainGroup.setAttribute('transform',
            'translate(' + t.x + ',' + t.y + ') scale(' + t.scale + ')');
    }

    function centerView(state) {
        var rect = state.container.getBoundingClientRect();
        state.transform.x = rect.width / 2;
        state.transform.y = rect.height / 2;
        state.transform.scale = 0.85;
        applyTransform(state);
    }

    // ──────────────────────────────────────────────
    // Utility functions
    // ──────────────────────────────────────────────
    function createSVGEl(tag, attrs) {
        var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        if (attrs) {
            for (var key in attrs) {
                if (attrs.hasOwnProperty(key)) {
                    el.setAttribute(key, attrs[key]);
                }
            }
        }
        return el;
    }

    function measureText(str, fontSize) {
        // Approximate text width
        return str.length * fontSize * 0.55;
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

})();
