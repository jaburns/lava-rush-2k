const shell = require('shelljs');
const fs = require('fs');
const consts = require('./src/consts.json');
const _ = require('lodash');
const ShapeShifter = require('regpack/shapeShifter');

const GAME_NAME = 'lava-rush';
const SRC_DIR = 'src';
const MODE = process.argv[2] === 'plus' || process.argv[2] === 'pluszip' ? 'plus' : '2k';
const SHOULD_ZIP = process.argv[2] !== 'plus';

const FLAGS = {
    useRegPackShapeShifter: true,
    usePrecisionHeader: true,
};

const applyBuildRegions = source => {
    const result = [];
    let reading = true;

    source
        .split('\n')
        .map(x => x.trim())
        .forEach(line => {
            if (line.startsWith('//!')) {
                reading = line === '//!end' || line === '//!'+MODE;
            } else {
                if (reading) result.push(line);
            }
        });

    return result.join('\n');
};

const minifyHTML = html => html
    .split('\n')
    .map(x => x.trim())
    .join('');

const shortVarNames = _.range(10, 36)
    .map(x => x.toString(36))
    .filter(x => x !== 'g' && x !== 'a' && x !== 's');

const stripComments = js => js
    .replace(/\/\*[^\*]*\*\//g, '')
    .replace(/\/\/.*/g, '');

const minifyPrefixedIdentifiers = (prefix, js) => {
    const vars = _.uniq(js
        .match(new RegExp(`[^a-zA-Z0-9_]${prefix}[a-zA-Z0-9_]+`, 'g'))
        .map(x => x.substr(1)));

    vars.sort((a, b) => b.length - a.length);

    vars.forEach((v, i) => {
        js = js.replace(new RegExp('\\'+v, 'g'), shortVarNames[i]);
    });

    return js;
};

const applyConsts = source => {
    for (let k in consts) {
        source = source.replace(new RegExp(k, 'g'), consts[k]);
    }
    return source;
};

const getMinifiedShader = path => {
    const inputShader = applyBuildRegions(fs.readFileSync(path, 'utf8'));
    fs.writeFileSync('tmp_in.glsl', inputShader);

    const SHADER_MIN_TOOL = process.platform === 'win32' ? 'tools\\shader_minifier.exe' : 'mono tools/shader_minifier.exe';
    shell.exec(`${SHADER_MIN_TOOL} --preserve-externals --no-renaming-list main,i --format none tmp_in.glsl -o tmp_out.glsl`);
    let result = fs.readFileSync('tmp_out.glsl', 'utf8');

    // Force the raymarching loops to use the same iterator variable name
    result = result.replace(/for\(float .=0\.;.<99\.;\+\+.\)/g, 'for(float o=0.;o<99.;++o)');
    
    if (path.endsWith('.frag')) {
        if (FLAGS.usePrecisionHeader) {
            result = 'precision highp float;' + result;
        } else {
            result = result
                .replace(/vec(.) /g, 'highp vec$1 ')
                .replace(/mat(.) /g, 'highp mat$1 ')
                .replace(/float /g, 'highp float ');
        }
    }

    return result;
}

const insertShaders = js => {
    while (js.indexOf('__shader(') >= 0) {
        const match = js.match(/__shader\(['"]([^'"]+)['"]\)/);
        const shader = getMinifiedShader(SRC_DIR + '/' + match[1]);
        js = js.replace(/__shader\(['"][^'"]+['"]\)/, "'"+shader+"'");
    }
    
    return js;
};

const removeWhitespace = js => js
    .replace(/[ \t\r\n]+/g, '')
    .replace(/return/g, 'return ')
    .replace(/let/g, 'let ')
    .replace(/new/g, 'new ')
    .replace(/#/g, ' ');

const main = () => {
    console.log('Building...');

    let js = fs.readFileSync(SRC_DIR + '/main.js', 'utf8');

    js = applyBuildRegions(js);
    js = stripComments(js);
    js = removeWhitespace(js);
    js = applyConsts(js);
    js = insertShaders(js);
    js = minifyPrefixedIdentifiers('\\$', js);

    if (FLAGS.useRegPackShapeShifter) {
        js = new ShapeShifter().preprocess(js, {
            hashWebGLContext: true,
            contextVariableName: 'g',
            contextType: 1,
            reassignVars: true,
            varsNotReassigned: ['g','a','s'],
            useES6: true,
        })[2].contents;
    }

    const shimHTML = minifyHTML(applyBuildRegions(fs.readFileSync(SRC_DIR + '/index.html', 'utf8')));

    const BUILD_DIR = MODE === 'plus' ? 'plus' : 'docs';
    const HTML_NAME = MODE === 'plus' ? 'index.html' : 'a.html';
    const ZIP_NAME = `${GAME_NAME}-${MODE}.zip`;

    if (MODE === '2k') shell.mkdir('-p', BUILD_DIR);

    fs.writeFileSync(`${BUILD_DIR}/${HTML_NAME}`,
        shimHTML.replace(/__CODE__[^]*/,'')
        + js.trim()
        + shimHTML.replace(/[^_]*__CODE__/,'')
    );

    if (SHOULD_ZIP) {
        console.log('Zipping...');

        shell.cd(BUILD_DIR);
        if (MODE === 'plus') {
            shell.exec('..\\tools\\advzip.exe -q -a -4 ../'+ZIP_NAME+' *.*');
        } else {
            shell.exec('..\\tools\\advzip.exe -q -a -4 ../'+ZIP_NAME+' '+HTML_NAME);
        }
        shell.cd('..');

        console.log('Zipped: ' + fs.statSync(ZIP_NAME).size + ' / 2048');
    } else {
        console.log('Done');
    }
    console.log('');
    
    shell.rm('-rf', 'tmp*.*');
}

main();