<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Mindmap_CPT {

    public static function init() {
        add_action( 'init', array( __CLASS__, 'register_post_type' ), 5 );
    }

    public static function register_post_type() {
        $labels = array(
            'name'               => __( 'Mind Maps', 'mindmap-viewer' ),
            'singular_name'      => __( 'Mind Map', 'mindmap-viewer' ),
            'add_new'            => __( 'Add New Mind Map', 'mindmap-viewer' ),
            'add_new_item'       => __( 'Add New Mind Map', 'mindmap-viewer' ),
            'edit_item'          => __( 'Edit Mind Map', 'mindmap-viewer' ),
            'new_item'           => __( 'New Mind Map', 'mindmap-viewer' ),
            'view_item'          => __( 'View Mind Map', 'mindmap-viewer' ),
            'search_items'       => __( 'Search Mind Maps', 'mindmap-viewer' ),
            'not_found'          => __( 'No mind maps found', 'mindmap-viewer' ),
            'not_found_in_trash' => __( 'No mind maps found in trash', 'mindmap-viewer' ),
            'menu_name'          => __( 'Mind Maps', 'mindmap-viewer' ),
        );

        $args = array(
            'labels'       => $labels,
            'public'       => false,
            'show_ui'      => true,
            'show_in_menu' => true,
            'menu_icon'    => 'dashicons-networking',
            'supports'     => array( 'title' ),
            'has_archive'  => false,
            'rewrite'      => false,
        );

        register_post_type( 'mindmap', $args );
    }
}
