uniform vec4 g[2];

const float CELL_SIZE = 20.;

float noise(vec2 n) { 
	return fract(sin(dot(n, vec2(12.9, 4.1))) * 43.5);
}	


mat2 rot( float theta )
{
    float c = cos( theta );
    float s = sin( theta );
    return mat2( c, s, -s, c );
}

float sdBox( vec3 p, vec3 b )
{
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

vec2 getCellId( vec3 p )
{
    return vec2(
        floor((p.x+.5*CELL_SIZE)/CELL_SIZE),
        floor((p.z+.5*CELL_SIZE)/CELL_SIZE)
       );
}
float cellDist( vec2 id, vec3 p )
{
    float seed = noise(id);
    p -= vec3(id.x,0,id.y)*CELL_SIZE;
    p.xz *= rot(100.*noise(vec2(seed,4.)));
    return sdBox( p, vec3(
        5. +  8.*noise(vec2(seed,1.)),
        100. + 20.*noise(vec2(seed,2.)),
        5. +  8.*noise(vec2(seed,3.))
    ));
}
float map( vec3 p )
{
    p.y += 100.;    
    float d = 200.;
    for( float dx = -1.; dx <= 1.; dx++ ) {
        for( float dy = -1.; dy <= 1.; dy++ ) {
            vec2 id = getCellId( p ) + vec2(dx, dy);
            d = min(d, cellDist( id, p ));
        }
    }
    return d;    
}
vec3 getColor( vec3 p )
{
    p = floor(p);
    return vec3( .5 + .5*mod(p.x + p.y + p.z, 2.) );
}





vec3 getNormal(vec3 p)
{
    vec2 e = vec2(.001, 0);
    return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)));
}

vec3 getColor( vec3 p )
{
    p = floor(p);
    return vec3( .5 + .5*mod(p.x + p.y + p.z, 2.) );
}

void main()
{
    vec2 uv = (gl_FragCoord.xy - .5*vec2(1024,768))/768.;
    vec3 ro = g[1].xyz; 
    vec3 rd = normalize(vec3(uv, 1));
    ro.y += .2*(sin(ro.x)+sin(ro.z));

    rd.yz *= rot(g[0].y);
    rd.xz *= rot(g[0].x);

    float totalDist = 0.;
    float dist = 0.;

    vec3 roo = ro;
    
    for( int i = 0; i < 99; ++i )
    {
        dist = map( ro );
        if( dist < .001 || totalDist > 100. ) break;
        totalDist += dist*.9;
        ro += rd * dist*.9;
    }

    vec3 color = vec3(0);

    if( dist < .01 ) {
        color = getColor(ro); // .5+.5*getNormal(ro);
        color *= exp(-totalDist/30.) * (.5+.5*clamp(  dot(normalize(vec3(1,1,1)) , getNormal(ro) )  ,0.,1.));
//  } else {
//      roo.y += 2.;
//      float ph = -roo.y / rd.y;
//      if( ph > 0.0 ) {
//          vec3 p = roo + ph*rd;
//          color = exp(-ph/20.)*carpet(p.xz);
//      }
    }

    if (gl_FragCoord.x < 1. && gl_FragCoord.y < 1.) {
        float depth = map( roo + vec3(0,-3,0) );
        vec3 norm = getNormal( roo + vec3(0,-3,0));
        if( depth < 0. && norm.y > .99 ) {
            vec3 delta = norm * depth;
            gl_FragColor = vec4(-delta.y,0,0,1);
        } else {
            gl_FragColor = vec4(0);
        }
    } else {
        gl_FragColor = vec4(color,1);
    }
}