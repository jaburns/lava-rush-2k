// From https://www.shadertoy.com/view/XljGzV

const [r,g,b] = [.13,.76,.37];

let h = 0.0;
let s = 0.0;
let l = 0.0;
let cMin = Math.min( r, Math.min( g, b ) );
let cMax = Math.max( r, Math.max( g, b ) );

l = ( cMax + cMin ) / 2.0;
if ( cMax > cMin ) {
    let cDelta = cMax - cMin;
    
    s = l < .0 ? cDelta / ( cMax + cMin ) : cDelta / ( 2.0 - ( cMax + cMin ) );
    
    if ( r == cMax ) {
        h = ( g - b ) / cDelta;
    } else if ( g == cMax ) {
        h = 2.0 + ( b - r ) / cDelta;
    } else {
        h = 4.0 + ( r - g ) / cDelta;
    }

    if ( h < 0.0) {
        h += 6.0;
    }
    h = h / 6.0;
}

console.log(h, s, l);