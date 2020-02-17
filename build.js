const shell = require('shelljs');
const fs = require('fs');
const _ = require('lodash');

const SRC_DIR = 'src';
const MODE = process.argv[2] === 'plus' ? 'plus' : '2k';

const FLAGS = {
    useRegPack: true,
    decompressRegPack: true,
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

const getMinifiedShader = path => {
    const inputShader = applyBuildRegions(fs.readFileSync(path, 'utf8'));
    fs.writeFileSync('tmp_in.glsl', inputShader);

    const SHADER_MIN_TOOL = process.platform === 'win32' ? 'tools\\shader_minifier.exe' : 'mono tools/shader_minifier.exe';
    shell.exec(`${SHADER_MIN_TOOL} --preserve-externals --no-renaming-list main --format none tmp_in.glsl -o tmp_out.glsl`);
    const result = fs.readFileSync('tmp_out.glsl', 'utf8');
    
    if (path.endsWith('.frag')) {
        return 'precision highp float;' + result;
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
    let js = fs.readFileSync(SRC_DIR + '/main.js', 'utf8');

    js = applyBuildRegions(js);
    js = stripComments(js);
    js = removeWhitespace(js);
    js = insertShaders(js);
    js = minifyPrefixedIdentifiers('\\$', js);
    
    if (FLAGS.useRegPack) {
        fs.writeFileSync('tmp_in.js', js);

        console.log('Packing...');
        shell.exec('regpack '+
            '--contextType 1 '+
            '--crushGainFactor 1 '+
            '--crushLengthFactor 0 '+
            '--crushCopiesFactor 0 '+
            '--crushTiebreakerFactor 0 '+
            '--hashWebGLContext true '+
            '--contextVariableName g '+
            '--varsNotReassigned g,a,s '+
            '--useES6 true ' +
            'tmp_in.js > tmp_out.js'
        );
        console.log('');

        js = fs.readFileSync('tmp_out.js', 'utf8');

        if (FLAGS.decompressRegPack && js.indexOf('eval(_)') >= 0) {
            console.log('Reversing RegPack compression...');
            fs.writeFileSync('tmp_in.js', js.replace('eval(_)', 'console.log(_)'));
            shell.exec('node tmp_in.js > tmp_out.js');
            js = fs.readFileSync('tmp_out.js', 'utf8');
            console.log('');
        }
    }

    const shimHTML = minifyHTML(applyBuildRegions(fs.readFileSync(SRC_DIR + '/index.html', 'utf8')));

    const BUILD_DIR = MODE === 'plus' ? 'plus' : 'docs';
    const HTML_NAME = MODE === 'plus' ? 'index.html' : 'a.html';
    const ZIP_NAME = `marble-vault-${MODE}.zip`;

    if (MODE === '2k') shell.mkdir('-p', BUILD_DIR);

    fs.writeFileSync(`${BUILD_DIR}/${HTML_NAME}`,
        shimHTML.replace(/__CODE__[^]*/,'')
        + js.trim()
        + shimHTML.replace(/[^_]*__CODE__/,'')
    );

    shell.cd(BUILD_DIR);
    if (MODE === 'plus') {
        shell.exec('..\\tools\\advzip.exe -q -a -4 ../'+ZIP_NAME+' *.*');
    } else {
        shell.exec('..\\tools\\advzip.exe -q -a -4 ../'+ZIP_NAME+' '+HTML_NAME);
    }
    shell.cd('..');

    console.log('Zipped: ' + fs.statSync(ZIP_NAME).size + ' / 2048');
    console.log('');
    
    shell.rm('-rf', 'tmp*.*');
}

main();