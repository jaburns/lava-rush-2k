//!plus
    plus_MUSIC_VOL = .5;

    plus_didThrottleFPS = false;
    plus_lastFrameTime = 0;
    plus_frameTimeBuffer = [];
    plus_frames = 0;
    plus_stepCounter = 0;
    plus_grounded = false;
    plus_fireVol = 0;

    g.clearColor(0,0,0,1);
    g.clear(g.COLOR_BUFFER_BIT);
    a.style.cursor = 'pointer';
    s.innerText = 'Click#to#start';

    a.onclick = () => {
        plus_music = new Howl({
            src: ['music.mp3'],
            volume: plus_MUSIC_VOL,
        });

        plus_fire = new Howl({
            src: ['rising_fire.wav'],
            autoplay: true,
            volume: 0,
            loop: true,
        });

        plus_step = new Howl({
            src: ['step.wav'],
            volume: .4,
        });

        s.innerText = '';
        a.requestPointerLock();
        a.onmousemove = a.onmousemove || ($a => !DEAD_FRAMES && WON_FRAMES < 1 && (
            PLAYER_YAW += $sensitivity*$a.movementX,
            PLAYER_PITCH -= $sensitivity*$a.movementY
        ))
    ;
//!end

$shader = g.createProgram(),

$a = __shader('shader.vert'),
$b = g.createShader(g.VERTEX_SHADER),
g.shaderSource($b, $a),
g.compileShader($b),
g.attachShader($shader, $b),

$a = __shader('shader.frag'),
$b = g.createShader(g.FRAGMENT_SHADER),
g.shaderSource($b, $a),
g.compileShader($b),
g.attachShader($shader, $b),
//console.log(g.getShaderInfoLog($b)),

g.vertexAttribPointer(
    g.linkProgram($shader),
    2,
    g.BYTE,
    g.enableVertexAttribArray(g.useProgram($shader)),
    g.bindBuffer($a = g.ARRAY_BUFFER, g.createBuffer()),
    g.bufferData($a, Uint8Array.of(1, 1, 1, 128, 128, 1), $a + 82) // ARRAY_BUFFER + 82 = STATIC_DRAW; 128 = -127
),

$init = $a => (
    $shaderWriteBuffer = [0,0,0,-30,0,40,0,0,0,0,0,0],
    $shaderReadBuffer = new Uint8Array(8),
    $vx =
    $vy =
    $vz =
    $vx1 =
    $vz1 =
    $score =
    $canJump = 0,
    $keys = {}

//!plus
    ,plus_musicStarted = false
//!end
),

$sensitivity = .003,

a.onclick = $a => (
    a.requestPointerLock(),
    a.onmousemove = a.onmousemove || ($a => !DEAD_FRAMES && WON_FRAMES < 1 && (
        PLAYER_YAW += $sensitivity*$a.movementX,
        PLAYER_PITCH -= $sensitivity*$a.movementY
    ))
),

document.onkeydown = $a => (
    $a.keyCode > 48 && $a.keyCode < 58 && ($sensitivity = .0005*($a.keyCode-48)),
    $keys[$a.keyCode] = 1
//!plus
    ,$a.preventDefault()
//!end
),

document.onkeyup = $a => $keys[$a.keyCode] = 0,

$readFloat = $a => ($shaderReadBuffer[$a]/255 + $shaderReadBuffer[$a+1]/255/255)*2 - 1,

$main = $a => (
    DEAD_FRAMES > 180 && $init(),

    $vy -= .02,
    PLAYER_Y += $vy,

    $vx = $vz = 0,

    WON_FRAMES < 1 && (
        $keys[87] && ($vx += Math.sin(PLAYER_YAW), $vz += Math.cos(PLAYER_YAW)),
        $keys[83] && ($vx -= Math.sin(PLAYER_YAW), $vz -= Math.cos(PLAYER_YAW)),
        $keys[68] && ($vx += Math.cos(PLAYER_YAW), $vz -= Math.sin(PLAYER_YAW)),
        $keys[65] && ($vx -= Math.cos(PLAYER_YAW), $vz += Math.sin(PLAYER_YAW)),
        $keys[32] && $canJump && (PLAYER_Y += ($vy = .5), $canJump = 0),
        $vx && $vz && (
            $vx /= Math.sqrt($vz*$vz + $vx*$vx),
            $vz /= Math.sqrt($vz*$vz + $vx*$vx)),

        LAVA_LEVEL += .05
    ),

    $shaderReadBuffer[6] && $vx && $vz && HEAD_BOB++,

    PLAYER_X += .4*($vx1 += ($vx - $vx1)/5),
    PLAYER_Z += .4*($vz1 += ($vz - $vz1)/5),

    (PLAYER_Y < LAVA_LEVEL + 1 || DEAD_FRAMES < 0)
        && DEAD_FRAMES++
        || (s.innerText = ($score = PLAYER_Y > $score ? PLAYER_Y|0 : $score)),

//!plus
    DEAD_FRAMES == 1 && (
        plus_music.fade(plus_MUSIC_VOL, 0, 3000),
        plus_fire.fade(plus_fireVol, 0, 2000),
        plus_fireVol = 0
    ),
    WON_FRAMES == 0 && DEAD_FRAMES == 0 && (
        plus_targetVol = Math.max(0,Math.min(1,  1-.05*(PLAYER_Y - LAVA_LEVEL)  )),
        plus_fireVol += (plus_targetVol - plus_fireVol) / 20,
        plus_fire.volume(plus_fireVol)
    ),
    ($vx || $vz) && plus_grounded && plus_stepCounter % 16 == 0 && plus_step.rate(.8+.4*Math.random(), plus_step.play()),
    plus_stepCounter++,
//!end

    g.readPixels(
        g.drawArrays(
            g.TRIANGLES,
            g.uniform4fv(g.getUniformLocation($shader, 'g'), $shaderWriteBuffer),
            3
        ),
        0, 2, 1, g.RGBA, g.UNSIGNED_BYTE, $shaderReadBuffer
    ),

    PLAYER_X += $readFloat(0),
    PLAYER_Y += $readFloat(2),
    PLAYER_Z += $readFloat(4),
    $shaderReadBuffer[6] && (
        $vy = 0,
        $canJump = 1,
        !WON_FRAMES && $score > 308 && (
            ++WON_FRAMES,
            $score = LAVA_LEVEL/.05,
            $score = ($score/60|0) + '.' + ($score=$score/.6%100|0, $score>9?$score:'0'+$score) + '#s'
//!plus
            ,plus_music.fade(plus_MUSIC_VOL, 0, 5000),
            plus_fire.fade(plus_fireVol, 0, 2000)
//!end
        )

//!plus
        ,!plus_musicStarted && (
            plus_musicStarted = true,
            !plus_music.playing() && plus_music.play(),
            plus_music.seek(0),
            plus_music.volume(plus_MUSIC_VOL)
        ),
        !plus_grounded && (
            plus_step.rate(.8+.4*Math.random(), plus_step.play()),
            plus_stepCounter = 1,
            plus_grounded = true
        )
//!end
    ),

    WON_FRAMES && WON_FRAMES++,

//!plus
    !$shaderReadBuffer[6] && (plus_grounded = false),

    !plus_didThrottleFPS && plus_frames++ > 30 && (
        plus_nuFrameTime = performance.now(),
        plus_lastFrameTime !== 0 && plus_frameTimeBuffer.push(plus_nuFrameTime - plus_lastFrameTime),
        plus_lastFrameTime = plus_nuFrameTime,

        plus_frameTimeBuffer.length > 30 && (
            plus_FPS = 1000 / (plus_frameTimeBuffer.reduce((a, x) => a + x) / plus_frameTimeBuffer.length),
            plus_frameTimeBuffer = [],
            plus_FPS > 70 && (
                plus_didThrottleFPS = true,
                setInterval($main, 1000 / 60)
            )
        )
    ),

    !plus_didThrottleFPS &&
//!end

    requestAnimationFrame($main)
),
$init(),$main()

//!plus
}
//!end