uniform vec4 g[2];

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

int mapMode; // 0: Sample for rendering, 1: Sample for xz collision check, 2: Sample for y collision check

vec4 map( vec3 p0 )
{
    const float i_CELL_SIZE = 20.;
    const float i_CELL_HALF = 10.;

    vec4 d = vec4(200);

    for( float dx = -1.; dx <= 1.; dx++ ) {
        for( float dy = -1.; dy <= 1.; dy++ )
        {
            vec2 id = vec2(dx,dy) + floor((p0.xz+i_CELL_HALF)/i_CELL_SIZE);

            vec3 p = p0 - vec3(id.x,-100./i_CELL_SIZE,id.y)*i_CELL_SIZE;

            p.xz *= rot(6.3*hash(vec2(hash(id),4)));

            vec3 q = abs(p) - vec3(
                5.+8.*hash(vec2(hash(id),1)),
                min( 400., 
                    id.y < -1.
                        ? 0.
                        : mapMode != 1 
                            ? 100. + 20.*hash(vec2(hash(id),2)) + 5.*id.y
                            : p0.y > 20.*hash(vec2(hash(id),2)) + 5.*id.y
                                ? 0.
                                : 1000.
                ),
                5.+8.*hash(vec2(hash(id),3))
            );

            p = floor(p);
            
            vec4 cd = vec4(
                // xyz: color
                (.45+.51*(clamp(abs(mod(fract(   hash(vec2(hash(id),5))   )*6.+vec3(0,4,2),6.)-3.)-1.,0.,1.)-.5)) // hsl to rgb
            ,
                // w: Distance
                length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.) 
            );

            d = cd.w < d.w ? cd : d;
        }
    }

    if (mapMode == 0) {
        float sf = surfFunc(p0);
        d.w -= sf;
        d.xyz -= sf;
        d.xyz += pow(1.-sf,3.)*vec3(1,.25,.1)*(.75+.25*sin(g[0].z));
    }

    return d;
}

vec3 getNormal(vec3 p)
{
    vec2 e = vec2(.001, 0);
    return normalize(vec3(
        map(p + e.xyy).w - map(p - e.xyy).w,
        map(p + e.yxy).w - map(p - e.yxy).w,
        map(p + e.yyx).w - map(p - e.yyx).w));
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

    float totalDist;
    vec4 dist;

    vec2 uv = (gl_FragCoord.xy - .5*vec2(320,200))/200.;

    vec3 ro = g[1].xyz;
    vec3 rd = vec3(0,-1,0);

    mapMode = 2;

// ---- March ----------------------------------------------
    totalDist = 0.;
    dist = vec4(0);
    for( int i = 0; i < 99; ++i ) {
        dist = map( ro );
        if( dist.w < .001 || totalDist > 200. ) break;
        totalDist += dist.w*.8;
        ro += rd * dist.w*.8;
    }
// ---------------------------------------------------------

    float dy = totalDist;
    ro = g[1].xyz; 
    rd = normalize(vec3(uv, 1));

    mapMode = 1;
    vec3 pdelta = vec3(0);
    vec3 roo = ro;
    float dxz = map( ro - vec3(0,2,0) ).w; // 2 = player height (3) - collision ring elevation (1)
    if (dy < 3.) pdelta.y = 3.-dy; // 3 = player height
    if (dxz < 2.) pdelta.xz = (2.-dxz) * getNormal( ro - vec3(0,2,0) ).xz; // 2 = player xz radius
    mapMode = 0;

    if (gl_FragCoord.x <= 2. && gl_FragCoord.y < 1.) {
        gl_FragColor = gl_FragCoord.x < 1.
            ? vec4(writeFloat(pdelta.x),writeFloat(pdelta.y))
            : vec4(writeFloat(pdelta.z), dy < 3. ? 1 : 0, 0);
        return;
    }

    ro += pdelta;

    ro.y += .1*(sin(ro.x)+sin(ro.z));
    rd.yz *= rot(g[0].y);
    rd.xz *= rot(g[0].x);

// ---- March ----------------------------------------------
    totalDist = 0.;
    dist = vec4(0);
    for( int i = 0; i < 99; ++i ) {
        dist = map( ro );
        if( dist.w < .001 || totalDist > 200. ) break;
        totalDist += dist.w*.8;
        ro += rd * dist.w*.8;
    }
// ---------------------------------------------------------


    vec3 color = i_FOG;

    vec3 albedo;
    float pointLightI;
    float glowI;

    float ph = -(roo.y - g[0].z) / rd.y;
    if ( ph > 0.0 && (ph < totalDist || totalDist > 200.) ) {
        glowI = 2.-surfFunc(roo+ph*rd);
        albedo = vec3(1);
        pointLightI = 0.;
        totalDist = ph;
    } else if (totalDist < 200.) {
        glowI = 2.*clamp(1.-.1*(ro.y-g[0].z),0.,1.);
        glowI *= glowI;
        albedo = dist.xyz;
        vec3 L = g[1].xyz-ro;
        pointLightI = .4+.6*dot(normalize(L),getNormal(ro));
    }

    color = albedo * glowI * i_LAVA 
        + albedo * pointLightI;

    color = mix(i_FOG, color, exp(-totalDist/40.));
    color = mix(color, vec3(0), -g[0].w/30.);

    gl_FragColor = vec4(color,1);
}