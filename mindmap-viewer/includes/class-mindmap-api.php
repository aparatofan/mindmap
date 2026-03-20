<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Mindmap_API {

    public static function init() {
        add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
    }

    public static function register_routes() {
        register_rest_route( 'mindmap/v1', '/map/(?P<id>\d+)', array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'get_map' ),
            'permission_callback' => '__return_true',
            'args'                => array(
                'id' => array(
                    'validate_callback' => function ( $param ) {
                        return is_numeric( $param );
                    },
                ),
            ),
        ) );

        register_rest_route( 'mindmap/v1', '/maps', array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'list_maps' ),
            'permission_callback' => '__return_true',
        ) );
    }

    public static function get_map( $request ) {
        $id = absint( $request['id'] );
        if ( 'mindmap' !== get_post_type( $id ) ) {
            return new WP_Error( 'not_found', 'Mind map not found', array( 'status' => 404 ) );
        }

        return rest_ensure_response( mindmap_viewer_get_map_data( $id ) );
    }

    public static function list_maps( $request ) {
        $maps = get_posts( array(
            'post_type'   => 'mindmap',
            'numberposts' => -1,
            'post_status' => 'publish',
        ) );

        $result = array();
        foreach ( $maps as $map ) {
            $result[] = array(
                'id'    => $map->ID,
                'title' => $map->post_title,
            );
        }

        return rest_ensure_response( $result );
    }
}
