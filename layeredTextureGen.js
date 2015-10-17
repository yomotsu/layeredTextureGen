var layeredTextureGen = ( function () {

  var layeredTextureGen = {};
  var textureLoader = new THREE.TextureLoader();
  console.log( textureLoader );
  var scene = new THREE.Scene();
  var camera = new THREE.OrthographicCamera( -1, 1, 1, -1, 0, 1 );
  var quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), null );
  scene.add( quad );

  var getVS = function () {

    var vs = [
      'varying vec2 vUv;',

      'void main () {',

        'vUv = uv;',
        'gl_Position =   projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

      '}'
    ].join( '\n' );

    return vs;

  };


  var getFS = function ( num ) {

    var uniform = [];

    for ( i = 0; i < num; i ++ ) {

      uniform.push(
        'uniform sampler2D layer' + i + ';',
        'uniform vec2 repeat'     + i + ';',
        'uniform sampler2D mask'  + i + ';'
      );

    }

    var alpha = [];

    for ( i = 0; i < num; i ++ ) {

      alpha.push(
        'float alpha' + i + ' = texture2D( mask' + i + ', vUv ).x;'
      );

    }

    var color = [];

    for ( i = 0; i < num; i ++ ) {

      color.push(
        'vec3 color' + i + ' = texture2D( layer' + i + ', vUv * repeat' + i + ' ).xyz;'
      );

    }

    var diffuse = [];

    for ( i = 0; i < num; i ++ ) {

      diffuse.push(
        'diffuse = alphaBlend( vec4( color' + i + ', alpha' + i + ' ), diffuse );'
      );

    }


    var fs = [
      'precision highp float;',

      'varying vec2 vUv;',

      uniform.join( '\n' ),

      'vec4 alphaBlend ( vec4 src, vec4 dst ) {',

        'vec3 color = vec3( src.xyz ) * src.w + vec3( dst.xyz ) * ( 1. - src.w );',
        'return vec4( color, 1 );',

      '}',

      'void main(void) {',

        'vec4 diffuse = vec4( 0, 0, 0, 1 );',

        alpha.join( '\n' ),
        color.join( '\n' ),
        diffuse.join( '\n' ),

        'gl_FragColor = diffuse;',

      '}'
    ].join( '\n' );

    return fs;

  };

  layeredTextureGen.Layer = function ( param ) {

    THREE.EventDispatcher.prototype.apply( this );

    var that = this;
    var count = 0;

    this.tile = textureLoader.load(
      param.tileURL,
      onload
    );
    this.tile.wrapS = THREE.RepeatWrapping;
    this.tile.wrapT = THREE.RepeatWrapping;
    this.mask = textureLoader.load(
      param.maskURL,
      onload
    );
    this.tileRepeat = param.tileRepeat || new THREE.Vector2( 1, 1 );

    function onload () {

      count ++;

      if ( count >= 2 ) {

        that.dispatchEvent( { type: 'loaded' } );

      }

    };

  };


  layeredTextureGen.generate = function ( width, height, renderer, layerArray ) {

    var texture = new THREE.WebGLRenderTarget( width, height, {
        minFilter: THREE.LinearMipMapLinear,
        magFilter: THREE.LinearFilter,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        format: THREE.RGBFormat,
        stencilBuffer: false,
        depthBuffer: false,
        type: THREE.FloatType
    } );

    var count = 0;
    var uniforms = {};

    for ( var i = 0, l = layerArray.length; i < l; i ++ ) {

      uniforms[ 'layer'  + i ] = { type: 't', value: null };
      uniforms[ 'mask'   + i ] = { type: 't', value: null };
      uniforms[ 'repeat' + i ] = { type: 'v2', value: new THREE.Vector2( 1, 1 ) };

    }

    var material = new THREE.ShaderMaterial( {
      vertexShader: getVS(),
      fragmentShader: getFS( layerArray.length ),
      uniforms: uniforms
    } );

    for ( var i = 0, l = layerArray.length; i < l; i ++ ) {

      material.uniforms[ 'layer'  + i ].value = layerArray[ i ].tile;
      material.uniforms[ 'mask'   + i ].value = layerArray[ i ].mask;
      material.uniforms[ 'repeat' + i ].value.copy( layerArray[ i ].tileRepeat );

      layerArray[ i ].addEventListener( 'loaded', function () {

        quad.material = material;
        material.needsUpdate = true;
        renderer.render( scene, camera, texture );

        // texture.needsUpdate = true;

        count ++;

        if ( count >= layerArray.length ) {

          texture.dispatchEvent( { type: 'loaded' } );
          // TODO
          // material should be removed here

        }

      } );

    }

    return texture;

  }

  layeredTextureGen.clear = function () {

    // TODO
    // material.dispose();
    // texture.dispose();

  }

  return layeredTextureGen;

} )();
