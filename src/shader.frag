uniform vec4 g[2];

int mapMode;

mat2 rot( float theta )
{
    return mat2( cos( theta ), sin( theta ), -sin( theta ), cos( theta ) );
}

float noise(vec2 n)
{ 
    return fract(sin(dot(n, vec2(12.9, 4.1))) * 43.5);
}	

// From Shane: https://www.shadertoy.com/view/4tSXRm
vec3 tri(in vec3 x){return abs(x-floor(x)-.5);} 
float surfFunc(in vec3 p){
    float n = dot(tri(p*.15 + tri(p.yzx*.075)), vec3(.444));
    p = p*1.5773 - n;
    p.yz = vec2(p.y + p.z, p.z - p.y) * .866;
    p.xz = vec2(p.x + p.z, p.z - p.x) * .866;
    n += dot(tri(p*.225 + tri(p.yzx*.1125)), vec3(.222));     
    return abs(n-.5)*1.9 + (1.-abs(sin(n*9.)))*.05;
}

vec4 map( vec3 p0 )
{
    const float i_CELL_SIZE = 20.;
    const float i_CELL_HALF = 10.;

    vec4 d = vec4(200);

    for( float dx = -1.; dx <= 1.; dx++ ) {
        for( float dy = -1.; dy <= 1.; dy++ )
        {
            vec2 id = vec2(dx,dy) + floor((p0.xz+i_CELL_HALF)/i_CELL_SIZE);

            vec3 q,p = p0 - vec3(id.x,-100./i_CELL_SIZE,id.y)*i_CELL_SIZE;
            p.xz *= rot(6.3*noise(vec2(noise(id),4)));

            q = abs(p) - vec3(
                5. +  8.*noise(vec2(noise(id),1)),
                min( 400., 
                    id.y < -1. // || id.x < -1.
                        ? 0.
                        : mapMode != 1 
                            ? 100. + 20.*noise(vec2(noise(id),2)) + 5.*id.y
                            : p0.y > 20.*noise(vec2(noise(id),2)) + 5.*id.y
                                ? 0.
                                : 1000.
                ),
                5. +  8.*noise(vec2(noise(id),3))
            );

            p = floor(p);
            
            vec4 cd = vec4(
                // xyz: color
                (.45+.51*(clamp(abs(mod(fract(   noise(vec2(noise(id),5))   )*6.+vec3(0,4,2),6.)-3.)-1.,0.,1.)-.5)) // hsl to rgb
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
        d.xyz += .5*pow(1.-sf,3.)*vec3(1,.25,.1);
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
    if (g[0].w > 0.) {
        gl_FragColor = vec4(mix(3.*vec3(1,.25,.1),vec3(0),g[0].w/60.),1);
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

    //const vec3 i_FOG = vec3(.03,0,.05); // vec3(.3,.3,.5);
    const vec3 i_FOG = vec3(0); // vec3(.3,.3,.5);

    vec3 color = i_FOG;

    vec3 albedo;
    float pointLightI;
    float glowI;

    float ph = -(roo.y - g[0].z) / rd.y;
    if ( ph > 0.0 && (ph < totalDist || totalDist > 200.) ) {
        glowI = 2.;
        albedo = vec3(1);
        pointLightI = 0.;
        totalDist = ph;
    } else if (totalDist < 200.) {
        glowI = 2.*clamp(1.-.1*(ro.y-g[0].z),0.,1.);
        glowI *= glowI;
        albedo = dist.xyz;
        vec3 L = g[1].xyz-ro;
        pointLightI = .4+.6*dot(normalize(L),getNormal(ro)) / pow(.8+.005*length(L),2.);
    }

    color = albedo * glowI * 3.*vec3(1,.25,.1)
        + albedo * pointLightI;

    color = mix(i_FOG, color, exp(-totalDist/40.));
    if (g[0].w < -30.) {
        color = mix(vec3(1), color, (-g[0].w-30.)/90.);
    } else {
        color = mix(color, vec3(0), -g[0].w/30.);
    }

    gl_FragColor = vec4(color,1);
}