uniform vec4 g[2];

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

float spheres( vec3 p )
{
    float c = 20.;
    vec3 q = mod(p+0.5*c,c)-0.5*c;
    q.y = p.y;

    float h = 3.*(floor((p.x+10.)/20.) + floor((p.z+10.)/20.));

    return sdBox( q + vec3(0,h,0), vec3(5,1,5));
}

float map( vec3 p )
{
    return spheres(p);
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
    p /= 5.3;
    p = mod(floor(p), 2.);
    return p.x == p.z ? vec3(1) : vec3(.4);
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
    
    for( int i = 0; i < 199; ++i )
    {
        dist = map( ro );
        if( dist < .001 || totalDist > 200. ) break;
        totalDist += dist*.5;
        ro += rd * dist*.5;
    }

    vec3 color = vec3(0);

    if( dist < .01 ) {
        color = getColor(ro); // .5+.5*getNormal(ro);
        color *= exp(-totalDist/50.);
//  } else {
//      roo.y += 2.;
//      float ph = -roo.y / rd.y;
//      if( ph > 0.0 ) {
//          vec3 p = roo + ph*rd;
//          color = exp(-ph/20.)*carpet(p.xz);
//      }
    }

    if (gl_FragCoord.x < 1. && gl_FragCoord.y < 1.) {
        float depth = map( roo + vec3(0,-2,0) );
        vec3 norm = getNormal( roo + vec3(0,-2,0));
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