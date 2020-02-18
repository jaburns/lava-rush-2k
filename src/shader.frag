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


vec4 map( vec3 p0 )
{
    const float i_CELL_SIZE = 20.;
    const float i_CELL_HALF = 10.;

    p0.y += 100.;    
    vec4 d = vec4(200);

    for( float dx = -1.; dx <= 1.; dx++ ) {
        for( float dy = -1.; dy <= 1.; dy++ )
        {
            vec2 id = vec2(dx,dy) + floor((p0.xz+i_CELL_HALF)/i_CELL_SIZE);

            float seed = noise(id);

            float theta = 6.3*noise(vec2(seed,4));

            vec3 p = p0 - vec3(id.x,0,id.y)*i_CELL_SIZE;
            p.xz *= rot(theta);

            vec3 q = abs(p) - vec3(
                5. +  8.*noise(vec2(seed,1)),
                100. + 20.*noise(vec2(seed,2)),
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

vec3 getNormal(vec3 p)
{
    vec2 e = vec2(.001, 0);
    return normalize(vec3(
        map(p + e.xyy).w - map(p - e.xyy).w,
        map(p + e.yxy).w - map(p - e.yxy).w,
        map(p + e.yyx).w - map(p - e.yyx).w));
}




void main()
{
    vec2 uv = (gl_FragCoord.xy - .5*vec2(1024,768))/768.;
    vec3 ro = g[1].xyz; 
    vec3 roo = ro;
    vec3 rd = normalize(vec3(uv, 1));
    ro.y += .2*(sin(ro.x)+sin(ro.z));

    rd.yz *= rot(g[0].y);
    rd.xz *= rot(g[0].x);

    float totalDist = 0.;
    vec4 dist = vec4(0);
    for( int i = 0; i < 99; ++i )
    {
        dist = map( ro );
        if( dist.w < .001 || totalDist > 100. ) break;
        totalDist += dist.w*.9;
        ro += rd * dist.w*.9;
    }

    const vec3 i_FOG = vec3(.3,.3,.5);

    vec3 color = totalDist < 100.
        ? mix(
            i_FOG,
            dist.xyz * (.5+.5*max(0.,dot(vec3(.6), getNormal(ro)))),
            exp(-totalDist/40.))
        : i_FOG;

    if (gl_FragCoord.x < 1. && gl_FragCoord.y < 1.) {
        float depth = map( roo + vec3(0,-3,0) ).w;
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