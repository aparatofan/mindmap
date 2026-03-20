(function($) {
    'use strict';

$(document).ready(function() {

    var branchCounter = $('#mindmap-branches-wrapper .mindmap-branch').length;

    // ──────────────────────────────────────────────
    // Image upload / remove (delegated)
    // ──────────────────────────────────────────────
    $(document).on('click', '.mindmap-upload-image', function(e) {
        e.preventDefault();
        var $field = $(this).closest('.mindmap-image-field');
        var frame = wp.media({
            title: 'Select Image',
            multiple: false,
            library: { type: 'image' }
        });
        frame.on('select', function() {
            var attachment = frame.state().get('selection').first().toJSON();
            $field.find('.mindmap-image-id').val(attachment.id);
            var url = attachment.sizes && attachment.sizes.thumbnail
                ? attachment.sizes.thumbnail.url
                : attachment.url;
            $field.find('.mindmap-image-preview').html('<img src="' + url + '" />');
            $field.find('.mindmap-remove-image').show();
        });
        frame.open();
    });

    $(document).on('click', '.mindmap-remove-image', function(e) {
        e.preventDefault();
        var $field = $(this).closest('.mindmap-image-field');
        $field.find('.mindmap-image-id').val('0');
        $field.find('.mindmap-image-preview').html('');
        $(this).hide();
    });

    // ──────────────────────────────────────────────
    // Add Branch
    // ──────────────────────────────────────────────
    $('#mindmap-add-branch').on('click', function() {
        var html = $('#tmpl-mindmap-branch').html();
        html = html.replace(/__BRANCH_IDX__/g, branchCounter);
        var $branch = $(html);
        $branch.find('.mindmap-branch-number').text(branchCounter + 1);
        $('#mindmap-branches-wrapper').append($branch);
        branchCounter++;
        renumberBranches();
    });

    // Remove Branch
    $(document).on('click', '.mindmap-remove-branch', function() {
        if (confirm('Remove this branch and all its items?')) {
            $(this).closest('.mindmap-branch').remove();
            renumberBranches();
        }
    });

    // Toggle Branch
    $(document).on('click', '.mindmap-toggle-branch', function() {
        var $body = $(this).closest('.mindmap-branch').find('.mindmap-branch-body').first();
        $body.slideToggle(200);
        $(this).text($body.is(':visible') ? '▲' : '▼');
    });

    // ──────────────────────────────────────────────
    // Add Item
    // ──────────────────────────────────────────────
    $(document).on('click', '.mindmap-add-item', function() {
        var branchIdx = $(this).data('branch');
        var $wrapper = $(this).siblings('.mindmap-items-wrapper');
        if (!$wrapper.length) {
            $wrapper = $(this).closest('.mindmap-branch-body').find('.mindmap-items-wrapper');
        }
        var itemIdx = $wrapper.find('.mindmap-item').length;

        var html = $('#tmpl-mindmap-item').html();
        html = html.replace(/__BRANCH_IDX__/g, branchIdx);
        html = html.replace(/__ITEM_IDX__/g, itemIdx);
        $wrapper.append(html);
    });

    // Remove Item
    $(document).on('click', '.mindmap-remove-item', function() {
        $(this).closest('.mindmap-item').remove();
    });

    // Toggle Item (show/hide notes)
    $(document).on('click', '.mindmap-toggle-item', function() {
        var $body = $(this).closest('.mindmap-item').find('.mindmap-item-body').first();
        $body.slideToggle(200);
        $(this).text($body.is(':visible') ? '▲' : '▼');
    });

    // ──────────────────────────────────────────────
    // Add Note
    // ──────────────────────────────────────────────
    $(document).on('click', '.mindmap-add-note', function() {
        var branchIdx = $(this).data('branch');
        var itemIdx = $(this).data('item');
        var $wrapper = $(this).siblings('.mindmap-notes-wrapper');
        if (!$wrapper.length) {
            $wrapper = $(this).closest('.mindmap-item-body').find('.mindmap-notes-wrapper');
        }
        var noteIdx = $wrapper.find('.mindmap-note').length;

        var html = $('#tmpl-mindmap-note').html();
        html = html.replace(/__BRANCH_IDX__/g, branchIdx);
        html = html.replace(/__ITEM_IDX__/g, itemIdx);
        html = html.replace(/__NOTE_IDX__/g, noteIdx);

        var $note = $(html);
        $note.find('.mindmap-note-number').text(noteIdx + 1);
        $wrapper.append($note);
    });

    // Remove Note
    $(document).on('click', '.mindmap-remove-note', function() {
        $(this).closest('.mindmap-note').remove();
    });

    // ──────────────────────────────────────────────
    // Sortable branches
    // ──────────────────────────────────────────────
    if ($.fn.sortable) {
        $('#mindmap-branches-wrapper').sortable({
            handle: '.mindmap-branch-drag-handle',
            items: '> .mindmap-branch',
            update: function() {
                renumberBranches();
            }
        });

        // Sortable items within each branch
        $(document).on('sortable-init', function() {
            $('.mindmap-items-wrapper').sortable({
                handle: '.mindmap-item-drag-handle',
                items: '> .mindmap-item'
            });
        });
        $(document).trigger('sortable-init');
    }

    // ──────────────────────────────────────────────
    // Re-index form names after reorder / remove
    // ──────────────────────────────────────────────
    function renumberBranches() {
        $('#mindmap-branches-wrapper .mindmap-branch').each(function(bIdx) {
            $(this).attr('data-index', bIdx);
            $(this).find('.mindmap-branch-number').first().text(bIdx + 1);

            // Update branch-level input names
            $(this).find('.mindmap-branch-body > .form-table input, .mindmap-branch-body > .form-table select, .mindmap-branch-body > .form-table textarea').each(function() {
                var name = $(this).attr('name');
                if (name) {
                    name = name.replace(/mindmap_branches\[\d+\]/, 'mindmap_branches[' + bIdx + ']');
                    $(this).attr('name', name);
                }
            });

            // Update add-item button data
            $(this).find('.mindmap-add-item').attr('data-branch', bIdx);
            $(this).find('.mindmap-items-wrapper').attr('data-branch', bIdx);

            // Update all nested inputs
            $(this).find('.mindmap-items-wrapper input, .mindmap-items-wrapper textarea').each(function() {
                var name = $(this).attr('name');
                if (name) {
                    name = name.replace(/mindmap_branches\[\d+\]/, 'mindmap_branches[' + bIdx + ']');
                    $(this).attr('name', name);
                }
            });

            // Update add-note buttons
            $(this).find('.mindmap-add-note').attr('data-branch', bIdx);
            $(this).find('.mindmap-notes-wrapper').attr('data-branch', bIdx);
        });
    }

}); // end document.ready

})(jQuery);
