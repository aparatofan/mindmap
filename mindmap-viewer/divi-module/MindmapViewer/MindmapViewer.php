<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Mindmap_Viewer_Divi_Module extends ET_Builder_Module {

    public $slug       = 'mm_mindmap_viewer';
    public $vb_support = 'partial';

    public function init() {
        $this->name = esc_html__( 'Mindmap Viewer', 'mindmap-viewer' );
        $this->icon = 'N'; // Divi networking icon

        $this->settings_modal_toggles = array(
            'general' => array(
                'toggles' => array(
                    'main_content' => esc_html__( 'Mind Map', 'mindmap-viewer' ),
                    'display'      => esc_html__( 'Display Settings', 'mindmap-viewer' ),
                ),
            ),
        );
    }

    public function get_fields() {
        // Build options array from published mind maps.
        $options = array( '0' => esc_html__( '-- Select a Mind Map --', 'mindmap-viewer' ) );
        $maps = get_posts( array(
            'post_type'   => 'mindmap',
            'numberposts' => 100,
            'post_status' => 'any',
        ) );
        foreach ( $maps as $map ) {
            $options[ (string) $map->ID ] = $map->post_title;
        }

        return array(
            'mindmap_id' => array(
                'label'       => esc_html__( 'Mind Map', 'mindmap-viewer' ),
                'type'        => 'select',
                'options'     => $options,
                'default'     => '0',
                'toggle_slug' => 'main_content',
                'description' => esc_html__( 'Select the mind map to display.', 'mindmap-viewer' ),
            ),
            'map_height' => array(
                'label'       => esc_html__( 'Height', 'mindmap-viewer' ),
                'type'        => 'text',
                'default'     => '600px',
                'toggle_slug' => 'display',
                'description' => esc_html__( 'Set the height of the mind map container (e.g. 600px, 80vh).', 'mindmap-viewer' ),
            ),
        );
    }

    public function render( $attrs, $content, $render_slug ) {
        $mindmap_id = absint( $this->props['mindmap_id'] );
        $height     = sanitize_text_field( $this->props['map_height'] );

        if ( ! $mindmap_id || 'mindmap' !== get_post_type( $mindmap_id ) ) {
            return '<div class="mindmap-placeholder">' . esc_html__( 'Please select a mind map.', 'mindmap-viewer' ) . '</div>';
        }

        wp_enqueue_style( 'mindmap-frontend' );
        wp_enqueue_script( 'mindmap-frontend' );

        $data = mindmap_viewer_get_map_data( $mindmap_id );

        $output = sprintf(
            '<div class="mindmap-container" style="height:%s" data-mindmap=\'%s\'></div>',
            esc_attr( $height ),
            esc_attr( wp_json_encode( $data ) )
        );

        return $output;
    }
}

new Mindmap_Viewer_Divi_Module();
