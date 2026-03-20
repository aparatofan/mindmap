<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Mindmap_Meta {

    public static function init() {
        add_action( 'add_meta_boxes', array( __CLASS__, 'add_meta_boxes' ) );
        add_action( 'save_post_mindmap', array( __CLASS__, 'save_meta' ), 10, 2 );
    }

    public static function add_meta_boxes() {
        add_meta_box(
            'mindmap_central',
            __( 'Central Topic', 'mindmap-viewer' ),
            array( __CLASS__, 'render_central_meta_box' ),
            'mindmap',
            'normal',
            'high'
        );

        add_meta_box(
            'mindmap_branches',
            __( 'Branches', 'mindmap-viewer' ),
            array( __CLASS__, 'render_branches_meta_box' ),
            'mindmap',
            'normal',
            'high'
        );

        add_meta_box(
            'mindmap_shortcode',
            __( 'Usage', 'mindmap-viewer' ),
            array( __CLASS__, 'render_shortcode_meta_box' ),
            'mindmap',
            'side',
            'high'
        );
    }

    public static function render_shortcode_meta_box( $post ) {
        echo '<p><strong>Shortcode:</strong></p>';
        echo '<code>[mindmap id="' . esc_html( $post->ID ) . '"]</code>';
        echo '<p style="margin-top:10px"><strong>Divi:</strong></p>';
        echo '<p>Use the "Mindmap Viewer" module in Divi Builder and select this mind map.</p>';
    }

    public static function render_central_meta_box( $post ) {
        wp_nonce_field( 'mindmap_save', 'mindmap_nonce' );

        $central = get_post_meta( $post->ID, '_mindmap_central', true );
        if ( ! is_array( $central ) ) {
            $central = array(
                'text'      => '',
                'image_id'  => 0,
                'show_text' => true,
            );
        }

        $image_url = '';
        if ( ! empty( $central['image_id'] ) ) {
            $image_url = wp_get_attachment_image_url( $central['image_id'], 'thumbnail' );
        }
        ?>
        <table class="form-table mindmap-meta-table">
            <tr>
                <th><label for="mindmap_central_text"><?php esc_html_e( 'Topic Name', 'mindmap-viewer' ); ?></label></th>
                <td>
                    <input type="text" id="mindmap_central_text" name="mindmap_central[text]"
                           value="<?php echo esc_attr( $central['text'] ); ?>" class="regular-text" />
                </td>
            </tr>
            <tr>
                <th><label><?php esc_html_e( 'Image', 'mindmap-viewer' ); ?></label></th>
                <td>
                    <div class="mindmap-image-field">
                        <input type="hidden" name="mindmap_central[image_id]"
                               value="<?php echo esc_attr( $central['image_id'] ); ?>"
                               class="mindmap-image-id" />
                        <div class="mindmap-image-preview">
                            <?php if ( $image_url ) : ?>
                                <img src="<?php echo esc_url( $image_url ); ?>" />
                            <?php endif; ?>
                        </div>
                        <button type="button" class="button mindmap-upload-image">
                            <?php esc_html_e( 'Select Image', 'mindmap-viewer' ); ?>
                        </button>
                        <button type="button" class="button mindmap-remove-image" <?php echo empty( $central['image_id'] ) ? 'style="display:none"' : ''; ?>>
                            <?php esc_html_e( 'Remove', 'mindmap-viewer' ); ?>
                        </button>
                    </div>
                </td>
            </tr>
            <tr>
                <th><label><?php esc_html_e( 'Show Text', 'mindmap-viewer' ); ?></label></th>
                <td>
                    <label>
                        <input type="checkbox" name="mindmap_central[show_text]" value="1"
                            <?php checked( ! empty( $central['show_text'] ) ); ?> />
                        <?php esc_html_e( 'Display topic name (uncheck to show image only)', 'mindmap-viewer' ); ?>
                    </label>
                </td>
            </tr>
        </table>
        <?php
    }

    public static function render_branches_meta_box( $post ) {
        $branches = get_post_meta( $post->ID, '_mindmap_branches', true );
        if ( ! is_array( $branches ) ) {
            $branches = array();
        }
        ?>
        <div id="mindmap-branches-wrapper">
            <?php
            if ( ! empty( $branches ) ) {
                foreach ( $branches as $b_idx => $branch ) {
                    self::render_branch_template( $b_idx, $branch );
                }
            }
            ?>
        </div>
        <p>
            <button type="button" class="button button-primary" id="mindmap-add-branch">
                <?php esc_html_e( '+ Add Branch', 'mindmap-viewer' ); ?>
            </button>
        </p>

        <!-- Hidden template for JS cloning -->
        <script type="text/html" id="tmpl-mindmap-branch">
            <?php self::render_branch_template( '__BRANCH_IDX__', array() ); ?>
        </script>
        <script type="text/html" id="tmpl-mindmap-item">
            <?php self::render_item_template( '__BRANCH_IDX__', '__ITEM_IDX__', array() ); ?>
        </script>
        <script type="text/html" id="tmpl-mindmap-note">
            <?php self::render_note_template( '__BRANCH_IDX__', '__ITEM_IDX__', '__NOTE_IDX__', array() ); ?>
        </script>
        <?php
    }

    public static function render_branch_template( $b_idx, $branch ) {
        $branch = wp_parse_args( $branch, array(
            'text'     => '',
            'image_id' => 0,
            'items'    => array(),
        ) );

        $image_url = '';
        if ( ! empty( $branch['image_id'] ) ) {
            $image_url = wp_get_attachment_image_url( $branch['image_id'], 'thumbnail' );
        }
        ?>
        <div class="mindmap-branch" data-index="<?php echo esc_attr( $b_idx ); ?>">
            <div class="mindmap-branch-header">
                <span class="mindmap-branch-drag-handle dashicons dashicons-move"></span>
                <span class="mindmap-branch-title">
                    <?php
                    /* translators: %s: branch number */
                    printf( esc_html__( 'Branch %s', 'mindmap-viewer' ), '<span class="mindmap-branch-number">' . ( is_numeric( $b_idx ) ? intval( $b_idx ) + 1 : '#' ) . '</span>' );
                    ?>
                </span>
                <button type="button" class="button mindmap-toggle-branch"><?php esc_html_e( '▼', 'mindmap-viewer' ); ?></button>
                <button type="button" class="button mindmap-remove-branch"><?php esc_html_e( '✕ Remove', 'mindmap-viewer' ); ?></button>
            </div>
            <div class="mindmap-branch-body">
                <table class="form-table mindmap-meta-table">
                    <tr>
                        <th><label><?php esc_html_e( 'Branch Text', 'mindmap-viewer' ); ?></label></th>
                        <td>
                            <input type="text" name="mindmap_branches[<?php echo esc_attr( $b_idx ); ?>][text]"
                                   value="<?php echo esc_attr( $branch['text'] ); ?>" class="regular-text mindmap-branch-text" />
                        </td>
                    </tr>
                    <tr>
                        <th><label><?php esc_html_e( 'Branch Image', 'mindmap-viewer' ); ?></label></th>
                        <td>
                            <div class="mindmap-image-field">
                                <input type="hidden" name="mindmap_branches[<?php echo esc_attr( $b_idx ); ?>][image_id]"
                                       value="<?php echo esc_attr( $branch['image_id'] ); ?>"
                                       class="mindmap-image-id" />
                                <div class="mindmap-image-preview">
                                    <?php if ( $image_url ) : ?>
                                        <img src="<?php echo esc_url( $image_url ); ?>" />
                                    <?php endif; ?>
                                </div>
                                <button type="button" class="button mindmap-upload-image">
                                    <?php esc_html_e( 'Select Image', 'mindmap-viewer' ); ?>
                                </button>
                                <button type="button" class="button mindmap-remove-image" <?php echo empty( $branch['image_id'] ) ? 'style="display:none"' : ''; ?>>
                                    <?php esc_html_e( 'Remove', 'mindmap-viewer' ); ?>
                                </button>
                            </div>
                        </td>
                    </tr>
                </table>

                <h4><?php esc_html_e( 'Items (Level 3)', 'mindmap-viewer' ); ?></h4>
                <div class="mindmap-items-wrapper" data-branch="<?php echo esc_attr( $b_idx ); ?>">
                    <?php
                    if ( ! empty( $branch['items'] ) && is_array( $branch['items'] ) ) {
                        foreach ( $branch['items'] as $i_idx => $item ) {
                            self::render_item_template( $b_idx, $i_idx, $item );
                        }
                    }
                    ?>
                </div>
                <p>
                    <button type="button" class="button mindmap-add-item" data-branch="<?php echo esc_attr( $b_idx ); ?>">
                        <?php esc_html_e( '+ Add Item', 'mindmap-viewer' ); ?>
                    </button>
                </p>
            </div>
        </div>
        <?php
    }

    public static function render_item_template( $b_idx, $i_idx, $item ) {
        $item = wp_parse_args( $item, array(
            'text'  => '',
            'notes' => array(),
        ) );
        ?>
        <div class="mindmap-item" data-index="<?php echo esc_attr( $i_idx ); ?>">
            <div class="mindmap-item-header">
                <span class="mindmap-item-drag-handle dashicons dashicons-move"></span>
                <input type="text"
                       name="mindmap_branches[<?php echo esc_attr( $b_idx ); ?>][items][<?php echo esc_attr( $i_idx ); ?>][text]"
                       value="<?php echo esc_attr( $item['text'] ); ?>"
                       class="regular-text" placeholder="<?php esc_attr_e( 'Expression text...', 'mindmap-viewer' ); ?>" />
                <button type="button" class="button mindmap-toggle-item"><?php esc_html_e( '▼', 'mindmap-viewer' ); ?></button>
                <button type="button" class="button mindmap-remove-item"><?php esc_html_e( '✕', 'mindmap-viewer' ); ?></button>
            </div>
            <div class="mindmap-item-body" style="display:none">
                <h5><?php esc_html_e( 'Notes (popup content)', 'mindmap-viewer' ); ?></h5>
                <div class="mindmap-notes-wrapper" data-branch="<?php echo esc_attr( $b_idx ); ?>" data-item="<?php echo esc_attr( $i_idx ); ?>">
                    <?php
                    if ( ! empty( $item['notes'] ) && is_array( $item['notes'] ) ) {
                        foreach ( $item['notes'] as $n_idx => $note ) {
                            self::render_note_template( $b_idx, $i_idx, $n_idx, $note );
                        }
                    }
                    ?>
                </div>
                <p>
                    <button type="button" class="button mindmap-add-note"
                            data-branch="<?php echo esc_attr( $b_idx ); ?>"
                            data-item="<?php echo esc_attr( $i_idx ); ?>">
                        <?php esc_html_e( '+ Add Note', 'mindmap-viewer' ); ?>
                    </button>
                </p>
            </div>
        </div>
        <?php
    }

    public static function render_note_template( $b_idx, $i_idx, $n_idx, $note ) {
        $note = wp_parse_args( $note, array(
            'text'     => '',
            'image_id' => 0,
        ) );

        $image_url = '';
        if ( ! empty( $note['image_id'] ) ) {
            $image_url = wp_get_attachment_image_url( $note['image_id'], 'thumbnail' );
        }
        ?>
        <div class="mindmap-note" data-index="<?php echo esc_attr( $n_idx ); ?>">
            <div class="mindmap-note-header">
                <span class="mindmap-note-label">
                    <?php
                    printf( esc_html__( 'Note %s', 'mindmap-viewer' ), '<span class="mindmap-note-number">' . ( is_numeric( $n_idx ) ? intval( $n_idx ) + 1 : '#' ) . '</span>' );
                    ?>
                </span>
                <button type="button" class="button mindmap-remove-note"><?php esc_html_e( '✕', 'mindmap-viewer' ); ?></button>
            </div>
            <div class="mindmap-note-body">
                <textarea name="mindmap_branches[<?php echo esc_attr( $b_idx ); ?>][items][<?php echo esc_attr( $i_idx ); ?>][notes][<?php echo esc_attr( $n_idx ); ?>][text]"
                          rows="3" class="large-text"
                          placeholder="<?php esc_attr_e( 'Note text...', 'mindmap-viewer' ); ?>"><?php echo esc_textarea( $note['text'] ); ?></textarea>
                <div class="mindmap-image-field" style="margin-top:8px">
                    <input type="hidden"
                           name="mindmap_branches[<?php echo esc_attr( $b_idx ); ?>][items][<?php echo esc_attr( $i_idx ); ?>][notes][<?php echo esc_attr( $n_idx ); ?>][image_id]"
                           value="<?php echo esc_attr( $note['image_id'] ); ?>"
                           class="mindmap-image-id" />
                    <div class="mindmap-image-preview">
                        <?php if ( $image_url ) : ?>
                            <img src="<?php echo esc_url( $image_url ); ?>" />
                        <?php endif; ?>
                    </div>
                    <button type="button" class="button mindmap-upload-image">
                        <?php esc_html_e( 'Select Image', 'mindmap-viewer' ); ?>
                    </button>
                    <button type="button" class="button mindmap-remove-image" <?php echo empty( $note['image_id'] ) ? 'style="display:none"' : ''; ?>>
                        <?php esc_html_e( 'Remove', 'mindmap-viewer' ); ?>
                    </button>
                </div>
            </div>
        </div>
        <?php
    }

    public static function save_meta( $post_id, $post ) {
        if ( ! isset( $_POST['mindmap_nonce'] ) || ! wp_verify_nonce( $_POST['mindmap_nonce'], 'mindmap_save' ) ) {
            return;
        }
        if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
            return;
        }
        if ( ! current_user_can( 'edit_post', $post_id ) ) {
            return;
        }

        // Save central topic.
        $central = array(
            'text'      => '',
            'image_id'  => 0,
            'show_text' => false,
        );
        if ( isset( $_POST['mindmap_central'] ) && is_array( $_POST['mindmap_central'] ) ) {
            $central['text']      = sanitize_text_field( wp_unslash( $_POST['mindmap_central']['text'] ?? '' ) );
            $central['image_id']  = absint( $_POST['mindmap_central']['image_id'] ?? 0 );
            $central['show_text'] = ! empty( $_POST['mindmap_central']['show_text'] );
        }
        update_post_meta( $post_id, '_mindmap_central', $central );

        // Save branches.
        $branches = array();
        if ( isset( $_POST['mindmap_branches'] ) && is_array( $_POST['mindmap_branches'] ) ) {
            foreach ( $_POST['mindmap_branches'] as $branch_data ) {
                $branch = array(
                    'text'     => sanitize_text_field( wp_unslash( $branch_data['text'] ?? '' ) ),
                    'image_id' => absint( $branch_data['image_id'] ?? 0 ),
                    'items'    => array(),
                );

                if ( ! empty( $branch_data['items'] ) && is_array( $branch_data['items'] ) ) {
                    foreach ( $branch_data['items'] as $item_data ) {
                        $item = array(
                            'text'  => sanitize_text_field( wp_unslash( $item_data['text'] ?? '' ) ),
                            'notes' => array(),
                        );

                        if ( ! empty( $item_data['notes'] ) && is_array( $item_data['notes'] ) ) {
                            foreach ( $item_data['notes'] as $note_data ) {
                                $item['notes'][] = array(
                                    'text'     => wp_kses_post( wp_unslash( $note_data['text'] ?? '' ) ),
                                    'image_id' => absint( $note_data['image_id'] ?? 0 ),
                                );
                            }
                        }

                        $branch['items'][] = $item;
                    }
                }

                $branches[] = $branch;
            }
        }
        update_post_meta( $post_id, '_mindmap_branches', $branches );
    }
}
