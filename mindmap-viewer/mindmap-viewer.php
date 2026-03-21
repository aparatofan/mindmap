<?php
/**
 * Plugin Name: Interactive Mindmap Viewer
 * Description: Create and display interactive mind maps with a Divi 4 module. Supports central topic with image, expandable branches, notes popups, and smooth bezier curve connections.
 * Version: 1.0.0
 * Author: Custom
 * Text Domain: mindmap-viewer
 * Requires at least: 5.0
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'MINDMAP_VIEWER_VERSION', '1.0.0' );
define( 'MINDMAP_VIEWER_PATH', plugin_dir_path( __FILE__ ) );
define( 'MINDMAP_VIEWER_URL', plugin_dir_url( __FILE__ ) );

// Load custom post type.
require_once MINDMAP_VIEWER_PATH . 'includes/class-mindmap-cpt.php';

// Load meta boxes.
require_once MINDMAP_VIEWER_PATH . 'includes/class-mindmap-meta.php';

// Load REST API.
require_once MINDMAP_VIEWER_PATH . 'includes/class-mindmap-api.php';

// Register custom post type on init.
add_action( 'init', array( 'Mindmap_CPT', 'register_post_type' ) );

// Wire up meta boxes and REST routes (these hooks fire later, safe to register now).
Mindmap_Meta::init();
Mindmap_API::init();

/**
 * Enqueue admin assets.
 */
function mindmap_viewer_admin_assets( $hook ) {
    global $post_type;
    if ( 'mindmap' !== $post_type ) {
        return;
    }
    if ( ! in_array( $hook, array( 'post.php', 'post-new.php' ), true ) ) {
        return;
    }

    wp_enqueue_media();

    wp_enqueue_style(
        'mindmap-admin',
        MINDMAP_VIEWER_URL . 'assets/css/mindmap-admin.css',
        array(),
        MINDMAP_VIEWER_VERSION
    );

    wp_enqueue_script(
        'mindmap-admin',
        MINDMAP_VIEWER_URL . 'assets/js/mindmap-admin.js',
        array( 'jquery', 'jquery-ui-sortable' ),
        MINDMAP_VIEWER_VERSION,
        true
    );
}
add_action( 'admin_enqueue_scripts', 'mindmap_viewer_admin_assets' );

/**
 * Enqueue frontend assets.
 */
function mindmap_viewer_frontend_assets() {
    wp_register_style(
        'mindmap-frontend',
        MINDMAP_VIEWER_URL . 'assets/css/mindmap-frontend.css',
        array(),
        MINDMAP_VIEWER_VERSION
    );

    wp_register_script(
        'mindmap-frontend',
        MINDMAP_VIEWER_URL . 'assets/js/mindmap-frontend.js',
        array(),
        MINDMAP_VIEWER_VERSION,
        true
    );
}
add_action( 'wp_enqueue_scripts', 'mindmap_viewer_frontend_assets' );

/**
 * Divi module disabled — use [mindmap id="123"] shortcode instead.
 * The native Divi module triggered fatal errors on PHP 8.3 and will be
 * revisited in a future release.
 */

/**
 * Register shortcode as fallback.
 */
function mindmap_viewer_shortcode( $atts ) {
    $atts = shortcode_atts( array( 'id' => 0 ), $atts, 'mindmap' );
    $id   = absint( $atts['id'] );
    if ( ! $id || 'mindmap' !== get_post_type( $id ) ) {
        return '';
    }

    wp_enqueue_style( 'mindmap-frontend' );
    wp_enqueue_script( 'mindmap-frontend' );

    $data = mindmap_viewer_get_map_data( $id );

    return sprintf(
        '<div class="mindmap-container" data-mindmap=\'%s\'></div>',
        esc_attr( wp_json_encode( $data ) )
    );
}
add_shortcode( 'mindmap', 'mindmap_viewer_shortcode' );

/**
 * Get mind map data for rendering.
 */
function mindmap_viewer_get_map_data( $post_id ) {
    $central      = get_post_meta( $post_id, '_mindmap_central', true );
    $branches     = get_post_meta( $post_id, '_mindmap_branches', true );

    if ( ! is_array( $central ) ) {
        $central = array(
            'text'       => get_the_title( $post_id ),
            'image_id'   => 0,
            'show_text'  => true,
        );
    }

    if ( ! is_array( $branches ) ) {
        $branches = array();
    }

    // Resolve image URLs.
    if ( ! empty( $central['image_id'] ) ) {
        $central['image_url'] = wp_get_attachment_image_url( $central['image_id'], 'medium' );
    }

    foreach ( $branches as &$branch ) {
        if ( ! empty( $branch['image_id'] ) ) {
            $branch['image_url'] = wp_get_attachment_image_url( $branch['image_id'], 'medium' );
        }
        if ( ! empty( $branch['items'] ) && is_array( $branch['items'] ) ) {
            foreach ( $branch['items'] as &$item ) {
                if ( ! empty( $item['notes'] ) && is_array( $item['notes'] ) ) {
                    foreach ( $item['notes'] as &$note ) {
                        if ( ! empty( $note['image_id'] ) ) {
                            $note['image_url'] = wp_get_attachment_image_url( $note['image_id'], 'large' );
                        }
                    }
                }
            }
        }
    }

    return array(
        'central'  => $central,
        'branches' => $branches,
    );
}
