uniform vec4 g[2];

const float i_SEED = 86.;

mat2 rot( float t )
{
    return mat2(cos(t), sin(t), -sin(t), cos(t));
}

float hash( vec2 n )
{
    return fract(sin(dot(n, vec2(12.9, 4.1))) * 43.5);
}

// ----- From Shane's "Jagged Plain" demo: https://www.shadertoy.com/view/4tSXRm -----
vec3 tri( vec3 x )
{
    return abs(x-floor(x)-.5);
} 
float surfFunc( vec3 p )
{
    float n = dot(tri(p*.15 + tri(p.yzx*.075)), vec3(.444));
    p = p*1.5773 - n;
    p.yz = vec2(p.y + p.z, p.z - p.y) * .866;
    p.xz = vec2(p.x + p.z, p.z - p.x) * .866;
    n += dot(tri(p*.225 + tri(p.yzx*.1125)), vec3(.222));     
    return abs(n-.5)*1.9 + (1.-abs(sin(n*9.)))*.05;
}
// -----------------------------------------------------------------------------------

int mapMode; // 0: Sample for rendering, 1: Sample for xz collision check, 2: Sample for y collision check, 3: color

float map( vec3 p0 )
{
    const float i_ROUNDING = 1.;
    const float i_CELL_SIZE = 20.;
    const float i_CELL_HALF = 10.;

    float d = 200.;

    for( float dx = -1.; dx <= 1.; dx++ ) {
        for( float dy = -1.; dy <= 1.; dy++ )
        {
            vec2 id = vec2(dx,dy) + floor((p0.xz+i_CELL_HALF)/i_CELL_SIZE);

            vec3 p = p0 - vec3(id.x,-100./i_CELL_SIZE,id.y)*i_CELL_SIZE;

            p.xz *= rot(6.3*hash(id+i_SEED*4.));

            vec3 q = abs(p) - vec3(
                5.+8.*hash(id+i_SEED),
                min( 400., 
                    id.y < -1.
                        ? 0.
                        : mapMode != 1 
                            ? 100. + 20.*hash(id+i_SEED*2.) + 5.*id.y
                            : p0.y > 20.*hash(id+i_SEED*2.) + 5.*id.y
                                ? 0.
                                : 1000.
                ),
                5.+8.*hash(id+i_SEED*3.)
            );
            if (mapMode == 0) q += i_ROUNDING;

            d = min(d, length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.));
        }
    }

    if (mapMode == 0) {
        d -= i_ROUNDING;
        d -= surfFunc(p0);
    }

    return .8*d;
}

vec3 getNormal(vec3 p)
{
    vec2 e = vec2(.001, 0);
    return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)));
}

vec2 writeFloat(float a)
{
    a = (a + 1.) / 2.;
    return vec2(
        floor(a*255.) / 255.,
        fract(a*255.)
    );
}

void main()
{
    const vec3 i_LAVA = vec3(3,.75,.3);
    const vec3 i_FOG = vec3(0);

    if (g[0].w > 0.) {
        gl_FragColor = vec4(mix(i_LAVA,vec3(0),g[0].w/60.),1);
        return;
    }

    float totalDist, dist;

    vec2 uv = (gl_FragCoord.xy - .5*vec2(320,200))/200.;

    vec3 ro = g[1].xyz;
    vec3 rd = vec3(0,-1,0);

    mapMode = 2;

// ---- March ----------------------------------------------
    totalDist = 0.;
    for( float c = 0.; c < 99.; ++c ) {
        dist = map( ro );
        if( dist < .001 || totalDist > 200. ) break;
        totalDist += dist;
        ro += rd * dist;
    }
// ---------------------------------------------------------

    ro = g[1].xyz; 
    rd = normalize(vec3(uv, 1));

    mapMode = 1;
    vec3 pdelta = vec3(0);
    vec3 roo = ro;
    float dxz = map( ro - vec3(0,2,0) )/.8; // 2 = player height (3) - collision ring elevation (1)
    if (totalDist < 3.) pdelta.y = 3.-totalDist; // 3 = player height
    if (dxz < 2.) pdelta.xz = (2.-dxz) * getNormal( ro - vec3(0,2,0) ).xz; // 2 = player xz radius
    mapMode = 0;

    if (gl_FragCoord.x <= 2. && gl_FragCoord.y < 1.) {
        gl_FragColor = gl_FragCoord.x < 1.
            ? vec4(writeFloat(pdelta.x),writeFloat(pdelta.y))
            : vec4(writeFloat(pdelta.z), totalDist < 3. ? 1 : 0, 0);
        return;
    }

    ro += pdelta;

    ro.y += .1*(sin(ro.x)+sin(ro.z));
    rd.yz *= rot(g[0].y);
    rd.xz *= rot(g[0].x);

// ---- March ----------------------------------------------
    totalDist = 0.;
    for( float c = 0.; c < 99.; ++c ) {
        dist = map( ro );
        if( dist < .001 || totalDist > 200. ) break;
        totalDist += dist;
        ro += rd * dist;
    }
// ---------------------------------------------------------

    vec3 color = i_FOG;

    float ph = -(roo.y - g[0].z) / rd.y;
    if ( ph > 0.0 && (ph < totalDist || totalDist > 200.) ) {
        color = (2.-surfFunc(roo+ph*rd))*i_LAVA;
        totalDist = ph;
    } else if (totalDist < 200.) {
        // hsl to rgb
        vec3 albedo = .45+.51*(clamp(abs(mod(fract(  .005*(ro.x+ro.y+ro.z)  )*6.+vec3(0,4,2),6.)-3.)-1.,0.,1.)-.5);

        dist = surfFunc(ro);
        albedo -= dist;
        albedo += pow(1.-dist,3.)*vec3(1,.25,.1)*(.75+.25*sin(g[0].z));

        color = albedo * (
            pow(2.*clamp(1.-.1*(ro.y-g[0].z),0.,1.),2.)*i_LAVA // rising lava glow
            +
            .4+.6*dot(normalize(g[1].xyz-ro),getNormal(ro)) // player point light
        );
    }

    color = mix(i_FOG, color, exp(-totalDist/40.));
    color = mix(color, vec3(0), -g[0].w/30.);

    gl_FragColor = vec4(color,1);
}