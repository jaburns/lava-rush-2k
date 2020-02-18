uniform vec4 g[2];

float noise(vec2 n) { 
    return fract(sin(dot(n, vec2(12.9, 4.1))) * 43.5);
}	

vec3 colorFromHue(float h)
{
    return .45 + .51*(
        clamp(
            abs(
                mod( fract(h) * 6. + vec3(0,4,2), 6.) - 3.
            ) - 1.,
            0.,
            1.
        ) - .5
    );
}
mat2 rot( float theta )
{
    return mat2( cos( theta ), sin( theta ), -sin( theta ), cos( theta ) );
}


const int i_MAP_MODE_3D = 0;
const int i_MAP_MODE_XZ = 1;

vec4 map( vec3 p0, int mode )
{
    const float i_CELL_SIZE = 20.;
    const float i_CELL_HALF = 10.;

    vec4 d = vec4(200);

    for( float dx = -1.; dx <= 1.; dx++ ) {
        for( float dy = -1.; dy <= 1.; dy++ )
        {
            vec2 id = vec2(dx,dy) + floor((p0.xz+i_CELL_HALF)/i_CELL_SIZE);

            float seed = noise(id);

            float theta = 6.3*noise(vec2(seed,4));

            vec3 p = p0 - vec3(id.x,-100./i_CELL_SIZE,id.y)*i_CELL_SIZE;
            p.xz *= rot(theta);

            float height = 20.*noise(vec2(seed,2));

            vec3 q = abs(p) - vec3(
                5. +  8.*noise(vec2(seed,1)),
                mode == 0
                    ? 100. + height
                    : p0.y > height ? 0. : 1000. ,
                5. +  8.*noise(vec2(seed,3))
            );

            p = floor(p);
            
            vec4 cd = vec4(
                (1.+.3*mod(p.x + p.y + p.z, 2.)) * colorFromHue(noise(vec2(seed,5))), // xyz: color
                length(max(q,0.)) + min(max(q.x,max(q.y,q.z)),0.)                     // w:   dist
            );

            d = cd.w < d.w ? cd : d;
        }
    }

    return d;    
}

float dpy( vec3 p )
{
    float totalDist = 0.;
    float dist = 0.;
    for( int i = 0; i < 99; ++i )
    {
        dist = map( p, 0 ).w;
        if( dist < .001 || totalDist > 100. ) break;
        totalDist += dist;
        p.y -= dist;
    }
    return totalDist;
}

vec3 getNormal(vec3 p, int mode)
{
    vec2 e = vec2(.001, 0);
    return normalize(vec3(
        map(p + e.xyy, mode).w - map(p - e.xyy, mode).w,
        map(p + e.yxy, mode).w - map(p - e.yxy, mode).w,
        map(p + e.yyx, mode).w - map(p - e.yyx, mode).w));
}


vec2 writeFloat(float a)
{
    a = (a + 1.) / 2.;
    return vec2(
        floor(a*255.) / 255.,
        fract(255. * a)
    );
}

void main()
{
    vec2 uv = (gl_FragCoord.xy - .5*vec2(1024,768))/768.;
    vec3 ro = g[1].xyz; 
    vec3 rd = normalize(vec3(uv, 1));

    float dy = dpy( ro );
    vec3 pdelta = vec3(0);
    float dxz = map( ro, 1 ).w;
    
    if (dy < 3.) pdelta.y = 3.-dy;
    if (dxz < 2.) pdelta.xz = (2.-dxz) * getNormal( ro, 1 ).xz;

    if (gl_FragCoord.x <= 2. && gl_FragCoord.y < 1.) {
        gl_FragColor = gl_FragCoord.x < 1.
            ? vec4(writeFloat(pdelta.x),writeFloat(pdelta.y))
            : vec4(writeFloat(pdelta.z), dy < 3. ? 1 : 0, 0);
        return;
    }

    ro += pdelta;

/*
    float pdepth = map( ro, 0 ).w;
    vec3 pnorm = getNormal( ro, 0 );
    vec3 pdelta = pdepth <= 3. ? pnorm * (3.-pdepth) : vec3(0);

    if (gl_FragCoord.x <= 2. && gl_FragCoord.y < 1.) {
        gl_FragColor = gl_FragCoord.x < 1.
            ? vec4(writeFloat(pdelta.x),writeFloat(pdelta.y))
            : vec4(writeFloat(pdelta.z), pdepth <= 3. && pnorm.y > .95 ? 1 : 0, 0);
        return;
    }

    ro += pdelta;
*/

    ro.y += .2*(sin(ro.x)+sin(ro.z));
    rd.yz *= rot(g[0].y);
    rd.xz *= rot(g[0].x);

    float totalDist = 0.;
    vec4 dist = vec4(0);
    for( int i = 0; i < 99; ++i )
    {
        dist = map( ro, 0 );
        if( dist.w < .001 || totalDist > 100. ) break;
        totalDist += dist.w*.9;
        ro += rd * dist.w*.9;
    }

    const vec3 i_FOG = vec3(.3,.3,.5);

    vec3 color = totalDist < 100.
        ? mix(
            i_FOG,
            dist.xyz * (.5+.5*max(0.,dot(vec3(.6), getNormal(ro,0)))),
            exp(-totalDist/40.))
        : i_FOG;

    gl_FragColor = vec4(color,1);
}