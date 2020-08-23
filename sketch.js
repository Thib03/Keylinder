var black = 0;
var white = 255;

var dimension;
var weight = 0.005;
var bigRadius = 0.35;
var littleRadius = 0.0905;

var velocity = [];
for(let n = 0; n < 7; n++) {
  velocity.push(0);
}

var number = [];
for(let n = 0; n < 75; n++) {
  number.push(0);
}

var notesOn = [];
for(let n = 0; n < 7; n++) {
  notesOn.push([]);
}

var notes = [];
var millisecond = 0;
var notePressed = -1;

var midiHandler;
var midi = 0;
var midiRadius = 0.35*littleRadius;

var midiInput, midiOutput;

var hasSequencer = false;
var sequencerOutput;

var launchpad;

var noteOnStatus     = 144;
var noteOffStatus    = 128;
var aftertouchStatus = 160;

var synth;

var font, fontLight;

var ndx = 7;
var dx = ndx;

var fundamental = 84;//5*7+0;

var tritons = [];

for(let i = 0; i < 6; i++) {
  tritons[i] = false;
}

let t1 = 0.01;
let l1 = 1; // velocity
let t2 = 0.01;
let l2 = 0.5; // aftertouch
let t3 = 0.3;
let l3 = 0;

var fonDeg = 0;
//var fonNum = 130;
var nextNote = false;

var dragX, dragY, dragDist;
var dragLimit = 0.1;

var midiScale = [[]];

var maxFreq = 10000;

function deg(d) {
  while(d < 1) {d += 7;}
  return (d-1)%7+1;
}

function ndt(n) {
  while(n < 0) {n += 12;}
  return n%12;
}

function alt(a) {
  while(a < -6) {a += 12;}
  while(a >  6) {a -= 12;}
  return a;
}

function degToNdt(d) {
  switch(deg(d)) {
    default:
    case 1: return 0;
    case 2: return 2;
    case 3:	return 4;
    case 4: return 5;
    case 5: return 7;
    case 6: return 9;
		case 7: return 11;
  }
}

function ndtToDeg(n) {
  switch(ndt(n)){
    case 0: return 1;
    case 2: return 2;
    case 4: return 3;
    case 5: return 4;
    case 7: return 5;
    case 9: return 6;
    case 11:return 7;
    default: return false;
  }
}

function degToColor(d,light=false) {
  if(light) {
    switch(deg(d)) {
      case 1:  return 41;
      case 3:  return 25;
      case 5:  return 60;
      case 7:  return 13;
      default: return 0;//70;
    }
  }
  switch(deg(d)) {
    case 1:  return [109,158,235];
    case 3:  return [146,196,125];
    case 5:  return [224,102,101];
    case 7:  return [254,217,102];
    default: return [217,217,217];
  }
}

function triggerColors(deg,overwrite = false) {
  var updateColumn = false;
  if(launchpad.isOn && ((fonDeg == deg && !overwrite) || !fonDeg)) {
    updateColumn = true;
  }
  if(fonDeg == deg) {
    if(overwrite) {
      return;
    }
    fonDeg = 0;
    for(let d = 1; d <= 7; d++) {
      notes[d-1].setColor(0);
      notes[d-1].updateText();
    }
  }
  else {
    fonDeg = deg;
    let i = fonDeg-1;
    for(let d = 1; d <= 7; d++) {
      notes[i].setColor(d);
      notes[i].updateText();
      i++;
      i %= 7;
    }
  }
  if(launchpad.isOn) {
    launchpad.update();
    if(updateColumn) {
      launchpad.sendControlColumn();
    }
  }
}

class Note {
  constructor(degree,f) {
    this.d = degree;
    this.fundamental = f;

    this.n = degToNdt(degree);
    this.angle = PI/2 - this.n*PI/6;

    this.velocity = 0;

    this.button = new Clickable();
    this.button.color = white;
    this.button.cornerRadius = 1000;
    this.button.stroke = black;
    this.button.text = '';

    this.updateText();
    this.textColor = black;

    var deg = this.d;

    var mX, mY;

    this.button.onPress = function() {
      mX = mouseX;
      mY = mouseY;
    }

    this.button.onRelease = function() {
      if(sqrt(pow(mX-mouseX,2)+pow(mY-mouseY,2)) < 1) {
        fundamental = f;
        if(midi) keylinderOutput.send(noteOnStatus,[f,100]);
        let nndx = 12-floor(fundamental/7)+floor(ndx/12)*12;
        if(ndx - nndx > 5) ndx = nndx + 12;
        else if(nndx - ndx > 6) ndx = nndx - 12;
        else ndx = nndx;
      }
    }

    this.update();
  }

  alt() {
    return alt(this.n-degToNdt(this.d));
  }

  alter(a) {
    this.n += a;
    this.updateText();
  }

  midiNumber(octave) {
    var oct = octave;
    if     (this.d < 4 && this.n > 8) {
      oct--;
    }
    else if(this.d > 4 && this.n < 3) {
      oct++;
    }
    var n = oct*12+this.n;
    if(n < 0) {n = 0};
    return n;
  }

  setPosition(x,y) {
    let r = littleRadius*dimension/2.5;
    this.button.resize(2*r,2*r);
    this.button.locate(x-r,y-r);
    this.button.strokeWeight = weight*dimension;
  }

  setColor(d) {
    if(!d) {
      this.button.color = white;
      return;
    }
    this.button.color = degToColor(d);
  }

  updateText() {
    var text = '';
    if(!fonDeg) {
      switch(this.d) {
        default:
        case 1: text += 'C'; break;
        case 2: text += 'D'; break;
        case 3: text += 'E'; break;
        case 4: text += 'F'; break;
        case 5: text += 'G'; break;
        case 6: text += 'A'; break;
        case 7: text += 'B'; break;
      }
      var a = this.alt();
      switch(a) {
        case -3: text += 'bbb';break;
        case -2: text += 'bb'; break;
        case -1: text += 'b';  break;
        case  0:               break;
        case  1: text += '#';  break;
        case  2: text += '##'; break;
        case  3: text += '###';break;
        default: text += Math.abs(a) + (a>0?'#':'b'); break;
      }
    }
    else {
      var a = alt(ndt(this.n-notes[fonDeg-1].n)-degToNdt(this.d-notes[fonDeg-1].d+1));
      switch(a) {
        case -3: text += '---';break;
        case -2: text += '--'; break;
        case -1: text += '-';  break;
        case  0:               break;
        case  1: text += '+';  break;
        case  2: text += '++'; break;
        case  3: text += '+++';break;
        default: text += Math.abs(a) + (a>0?'+':'-');  break;
      }
    }
    this.text = text;
  }

  update() {
    let vel = 6.5*(-pow(0.5*this.velocity/6.5-1,4)+1);
    let r = (littleRadius-vel*weight/2)*dimension;
    this.button.resize(2*r,2*r);
    this.button.locate(width/2 +bigRadius*dimension*cos(this.angle)-r,
                       height/2-bigRadius*dimension*sin(this.angle)-r);
    this.button.strokeWeight = (1+vel)*weight*dimension;
  }

  move() {
    var x = mouseX-width/2;
    var y = -(mouseY-height/2);
    let r = sqrt(pow(x,2)+pow(y,2));
    if(r >= (bigRadius-littleRadius)*dimension &&
       r <  (bigRadius+littleRadius)*dimension) {
      var a = Math.atan(y/x);
      if(x < 0) {
        a += PI;
      }
      this.angle = a;//lerp(this.angle,a,0.8);
    }
    else {
      this.angle = PI/2 - this.n*PI/6;
      notePressed = -1;
    }
    this.update();
    this.draw();
  }

  drawText() {
    fill(this.textColor);
    textAlign(CENTER,CENTER);
    var adjustY;
    textSize(0.036*dimension);
    adjustY = -0.005*dimension;
    textFont(smallFont);
    text(this.text,this.button.x+this.button.width/2,
                   this.button.y+this.button.height/2+adjustY);
  }

  draw() {
    this.button.draw();
    this.drawText();
  }
}

class Voice {
  constructor() {
    this.pit = -1;
    this.osc = new p5.Oscillator();
    this.env = new p5.Envelope();

    this.osc.setType('sine');
    this.osc.amp(this.env);
    this.osc.start();
  }
}

class PolySynth {
  constructor(num) {
    this.voices = [];
    this.reverb = new p5.Reverb();
    for(let v = 0; v < num; v++) {
      this.voices.push(new Voice());
      this.reverb.process(this.voices[v].osc,1,2);
    }
  }

  noteAttack(pit,vel) {
    var frq = 16.3515*exp(pit*log(2)/12);
    var voi = -1;
    for(let v = 0; v < this.voices.length; v++) {
      var voice = this.voices[v];
      if(voice.pit == pit) {
        voi = v;
        break;
      }
    }
    if(voi == -1) {
      for(let v = 0; v < this.voices.length; v++) {
        var voice = this.voices[v];
        if(voice.pit == -1) {
          voi = v;
          break;
        }
      }
    }
    if(voi >= 0) {
      var voice = this.voices[voi];
      voice.pit = pit;
      voice.osc.freq(frq);
      voice.env.set(t1,vel,t2,l2*vel,t3,l3);
      voice.env.triggerAttack();
    }
    else {
      console.log('Maximum number of voices reached.');
    }
  }

  noteAftertouch(pit,vel) {
    for(let v = 0; v < this.voices.length; v++) {
      var voice = this.voices[v];
      if(voice.pit == pit) {
        voice.env.ramp(voice[1],0,l2*vel);
        break;
      }
    }
  }

  noteRelease(pit) {
    for(let v = 0; v < this.voices.length; v++) {
      var voice = this.voices[v];
      if(voice.pit == pit) {
        voice.pit = -1;
        voice.env.triggerRelease();
        break;
      }
    }
  }
}

class Launchpad {
  constructor() {
    this.isOn = false;
    this.output = null;
    this.lightGrid = [];
    for(let r = 0; r < 8; r++) {
      var row = [];
      for(let c = 0; c < 8; c++) {
        row.push(false);
      }
      this.lightGrid.push(row);
    }
  }

  turnOn(output) {
    if(output == 'Launchpad Note') {
      for(let o = 0; o < WebMidi.outputs.length; o++) {
        if(WebMidi.outputs[o].name.includes('Launchpad Light')) {
          this.output = WebMidi.outputs[o];
        }
      }
    }
    else {
      this.output = WebMidi.outputs[output];
    }
    this.output.send(noteOnStatus,[10,degToColor(1,true)]);
    this.isOn = true;
    this.update();
  }

  sendControlColumn() {
    for(let d = 2; d <= 7; d++) {
      this.output.send(noteOnStatus,[d*10,fonDeg?degToColor(d,true):0]);
    }
  }

  update() {
    if(fonDeg) {
      var d = (8-fonDeg)%7+1;
      for(var r = 0; r < 8; r++) {
        for(var c = 0; c < 8; c++) {
          var color;
          if(this.lightGrid[r][c]) {
            color = 3;
          }
          else {
            color = degToColor(d,true);
          }
          this.output.send(noteOnStatus,[(r+1)*10+c+1,color]);
          d = d%7+1;
        }
        d = (d+2)%7+1;
      }
    }
    else {
      for(var r = 0; r < 8; r++) {
        if(r && r < 7) {
          this.output.send(noteOnStatus,[(r+1)*10,0]);
        }
        for(var c = 0; c < 8; c++) {
          var color;
          if(this.lightGrid[r][c]) {
            color = 3;
          }
          else {
            color = 0;
          }
          this.output.send(noteOnStatus,[(r+1)*10+c+1,color]);
        }
      }
    }
  }

  noteOn(row,col) {
    var color = 3;
    this.lightGrid[row][col] = true;
    this.output.send(noteOnStatus,[(row+1)*10+col+1,color]);
    if(col < 4) {
      if(row > 0) {
        this.lightGrid[row-1][col+4] = true;
        this.output.send(noteOnStatus,[row*10+col+5,color]);
      }
    }
    else {
      if(row < 7) {
        this.lightGrid[row+1][col-4] = true;
        this.output.send(noteOnStatus,[(row+2)*10+col-3,color]);
      }
    }
  }

  noteOff(row,col) {
    //var color = degToColor(deg,true);
    this.lightGrid[row][col] = false;
    //this.output.send(noteOnStatus,[(row+1)*10+col+1,color]);
    if(col < 4) {
      if(row > 0) {
        this.lightGrid[row-1][col+4] = false;
        //this.output.send(noteOnStatus,[row*10+col+5,color]);
      }
    }
    else {
      if(row < 7) {
        this.lightGrid[row+1][col-4] = false;
        //this.output.send(noteOnStatus,[(row+2)*10+col-3,color]);
      }
    }
    this.update();
  }
}

class MidiHandler {
  constructor() {
    this.button = new Clickable();
    this.button.color = white;
    this.button.cornerRadius = 1000;
    this.button.stroke = black;
    this.button.text = '';
    this.button.onPress = function() {
      enableMidi();
    }
    this.update();
  }

  update() {
    let r = midiRadius*dimension;
    this.button.resize(2*r,2*r);
    this.button.locate(0.9*width-r,
                      0.1*height-r);
    this.button.strokeWeight = weight*dimension;
  }

  draw() {
    this.button.draw();

    noStroke();
    fill(this.button.color==white?black:white);
    let r  = 0.14*midiRadius*dimension;
    let br = 0.6*midiRadius*dimension;
    for(let n = 0; n < 5; n++) {
      let a = n*PI/4;
      circle(0.9*width+br*cos(a),0.1*height-br*sin(a),2*r,2*r);
    }
    let l = 0.7*midiRadius*dimension;
    let h = 0.35*midiRadius*dimension;
    rect(0.9*width-l/2,0.1*height+1.1*br,l,h,h);
  }
}

function preload() {
  bigFont   = loadFont('nunito_light.ttf');
  smallFont = loadFont('nunito_bold.ttf');
}

/*var buf = new Float32Array( 1024 );
var MIN_SAMPLES = 0;
var GOOD_ENOUGH_CORRELATION = 0.9;*/

function setup() {
  createCanvas(windowWidth, windowHeight);

  dimension = Math.min(width,height);

  launchpad = new Launchpad();

  for(let n = 0; n < 12; n++) {
    let a = 0;
    switch(n) {
      case 0:
      case 1:
      case 2:
      case 3: a = -1; break;
      case 11: a = 1; break;
    }
    let newNote = new Note((8+4*n)%7+1,n*7);
    newNote.alter(a);
    notes.push(newNote);
    let otherNote;
    for(let d = 2; d <= 7; d++) {
      otherNote = new Note((d+n*4)%7+1,n*7+d-1);
      if(fundamental != 84 && n == floor(fundamental/7)) {
        otherNote.button.color = degToColor(deg(7-fundamental%7+d));
      }
      otherNote.alter(alt(degToNdt(otherNote.d-newNote.d+1)-ndt(otherNote.n-newNote.n)));
      notes.push(otherNote);
    }
  }


  //midiHandler = new MidiHandler();
  enableMidi();

  /*mic = new p5.AudioIn()
  mic.start();
  fft = new p5.FFT();
  fft.setInput(mic);*/

  userStartAudio().then(function() {
     console.log('Audio ready');
   });
}

function draw() {
  dx = lerp(dx,ndx,0.1);
  if(abs(dx-ndx) < 0.001) {
    while(ndx >= 12) ndx -= 12;
    while(ndx < 0) ndx += 12;
    dx = ndx;
  }
  //while(dx > 12) dx -= 12;
  //dx = 2 * mouseY / height * 12;
  //while(dx > 12) dx -= 12;
  background(white);

  noFill();
  stroke(black);
  strokeWeight(weight*dimension);

  let a = 0;
  while(a >= 12*PI/6) a -= 12*PI/6;
  let x0 = width/6+bigRadius*dimension*cos(a)/4;
  let x1;
  let x1a = 5*width/6+bigRadius*dimension*cos(a)/4;
  let x1b = 13*width/60+bigRadius*dimension*cos(a)/4;
  let y = height/2+bigRadius*dimension*sin(a);

  /*arc(width/6+bigRadius*dimension*(cos(a)-1)/4+(2-1)*(x1a-x0)/6,height/2,bigRadius*dimension/2,2*bigRadius*dimension,91*PI/60,29*PI/60);
  arc(width/6+bigRadius*dimension*(cos(a)-1)/4+(3-1)*(x1a-x0)/6,height/2,bigRadius*dimension/2,2*bigRadius*dimension,93*PI/60,27*PI/60);
  arc(width/6+bigRadius*dimension*(cos(a)-1)/4+(4-1)*(x1a-x0)/6,height/2,bigRadius*dimension/2,2*bigRadius*dimension,94.5*PI/60,25.5*PI/60);
  arc(width/6+bigRadius*dimension*(cos(a)-1)/4+(5-1)*(x1a-x0)/6,height/2,bigRadius*dimension/2,2*bigRadius*dimension,95.8*PI/60,24.2*PI/60);
  arc(width/6+bigRadius*dimension*(cos(a)-1)/4+(6-1)*(x1a-x0)/6,height/2,bigRadius*dimension/2,2*bigRadius*dimension,96.7*PI/60,23.3*PI/60);
  arc(width/6+bigRadius*dimension*(cos(a)-1)/4+(7-1)*(x1a-x0)/6,height/2,bigRadius*dimension/2,2*bigRadius*dimension,98*PI/60,22*PI/60);*/

  var tempNotes = [];

  for(let t = 0; t < 12; t++) {
    notes[t*7].button.color = white;
    if(fundamental != 84 && t == floor(fundamental/7)) notes[t*7].button.color = degToColor(deg(7-fundamental%7+1));
    let a = t*PI/6 + dx*PI/6;
    while(a >= 12*PI/6) a -= 12*PI/6;
    while(a < 0) a += 12*PI/6;
    let x0 = width/6+bigRadius*dimension*cos(a)/4;
    let x1;
    let x1a = 5*width/6+bigRadius*dimension*cos(a)/4;
    let x1b = 13*width/60+bigRadius*dimension*cos(a)/4;
    let y = height/2+bigRadius*dimension*sin(a);
    if(a >= 6*PI/6 && a < 11*PI/6) {
      x1 = x1b+(x1a-x1b)*(exp(((a-6*PI/6)/(4.99*PI/6)-1)*7));
    }
    else if(a >= 10*PI/6 || a < 1*PI/6) {
      x1 = x1a;
    }
    else if(a < 6*PI/6) {
      x1 = x1b+(x1a-x1b)*(exp(((6*PI/6-a)/(4.99*PI/6)-1)*7));
    }
    else {
      x1 = x1b;
    }
    line(x0,y,x1,y);
    let l = (x1-x0)/(x1a-x0);
    let nbrd = floor(l*6+1);
    if(nbrd >= 2) {//a >= 10.05*PI/6 || a < 1.95*PI/6) {
      for(d = 2; d <= nbrd; d++) {
        let newNote = notes[t*7+d-1];
        if(fundamental != 83 && t == floor(fundamental/7)) {
          newNote.button.color = degToColor(deg(7-fundamental%7+d));
        }
        else {
          newNote.button.color = white;
        }
        //newNote.alter(alt(degToNdt(newNote.d-notes[t].d+1)-ndt(newNote.n-notes[t].n)));
        newNote.setPosition(width/6+bigRadius*dimension*cos(a)/4+(d-1)*(x1a-x0)/6,height/2+bigRadius*dimension*sin(a));
        tempNotes.push(newNote);
        //if(t == 5) console.log(atan(4*tan(a)));
        if(a >= 9*PI/6 && a < 11.9*PI/6) {
          arc(width/6+(d-1)*(x1a-x0)/6,height/2,bigRadius*dimension/2,2*bigRadius*dimension,atan(4*tan(a)),0);
        }
        else if(a > 0.1 && a < 3*PI/6) {
          arc(width/6+(d-1)*(x1a-x0)/6,height/2,bigRadius*dimension/2,2*bigRadius*dimension,0,atan(4*tan(a)));
        }
      }
      stroke(black);
      noFill();
    }
  }
  ellipse(width/6,height/2,bigRadius*dimension/2,2*bigRadius*dimension);
  //ellipse(5*width/6,height/2,bigRadius*dimension/2,2*bigRadius*dimension);

  for(let n = 0; n < tempNotes.length; n++) {
    tempNotes[n].draw();
  }

  //var otherNotes = [];

  let nndx = dx;
  while(nndx >= 12) nndx -= 12;
  while(nndx < 0) nndx += 12;
  let t0 = (12-floor(nndx)+5)%12;
  let t1 = (t0+11)%12;
  //console.log("t0 : "+t0+" t1 : "+t1);

  let i = 0;
  for(let t = t0; i < 8; t++) {
    t %= 12;
    i++;
    let a = t*PI/6 + dx*PI/6;
    while(a >= 2*PI) a -= 2*PI;
    notes[t*7].setPosition(width/6+bigRadius*dimension*cos(a)/4,height/2+bigRadius*dimension*sin(a));
    notes[t*7].draw();
  }
  i = 0;
  for(let t = t1; i < 4; t--) {
    t += 12;
    t %= 12;
    i++;
    let a = t*PI/6 + dx*PI/6;
    while(a >= 2*PI) a -= 2*PI;
    notes[t*7].setPosition(width/6+bigRadius*dimension*cos(a)/4,height/2+bigRadius*dimension*sin(a));
    notes[t*7].draw();
  }

  /*var amp = floor(1000*mic.amplitude.volume);
  if(amp > 60) {
    let buf = fft.waveform();
    let freq = autoCorrelate(buf, sampleRate() );
    let pc = 12*log(freq/16.3515)/log(2);
    while(pc >= 12) {
      pc -= 12;
    }
    //console.log(pc);
    let r = bigRadius*dimension;
    let a = PI/2 - pc*PI/6;
    line(width/2,height/2,width/2+r*cos(a),height/2+r*sin(a))
  }*/

  /*for(let n = 0; n < 12; n++) {
    let a = PI/2 - n*PI/6;
    let r = bigRadius*dimension;
    let dr = 0.65*littleRadius*dimension;
    if(n < 6 && tritons[n]) {
      line(width/2+(r+dr)*cos(a),height/2-(r+dr)*sin(a),
           width/2+(r+dr)*cos(a+PI),height/2-(r+dr)*sin(a+PI));
    }
    else if(!tritons[n%6]) {
      line(width/2+(r+dr)*cos(a),height/2-(r+dr)*sin(a),
           width/2+(r-dr)*cos(a),height/2-(r-dr)*sin(a));
    }
  }*/

  /*for(let n = 0; n < notes.length; n++) {
    var note = notes[n];
    if(velocity[n] || note.velocity) {
      note.velocity = lerp(note.velocity,6.5*velocity[n],0.75);
      note.update();
    }
    if(n != notePressed) {
      note.draw();
    }
  }*/

  if(notePressed > -1) {
    if(dragDist < dragLimit*dimension) {
      dragDist += sqrt(pow(mouseX-dragX,2)+pow(mouseY-dragY,2));
      notes[notePressed].draw();
    }
    else {
      notes[notePressed].move();
    }
  }

  if(!midi) {
    //midiHandler.draw();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  dimension = Math.min(width,height);

  for(let n = 0; n < notes.length; n++) {
    notes[n].update();
  }

  midiHandler.update();
}

//------------------------------------------------------------------------------
//                             MOUSE
//------------------------------------------------------------------------------

var iMouseY = 0;

function mousePressed() {
  iMouseY = mouseY;
}

function mouseDragged() {
  ndx = ndx + 0.01*(mouseY - iMouseY);
  //while(ndx < 0) ndx += 12;
  //while(ndx >= 12) ndx -= 12;
  iMouseY = mouseY;
}

function mouseReleased() {
  ndx = round(ndx);
  iMouseY = 0;
}

//------------------------------------------------------------------------------
//                             MIDI
//------------------------------------------------------------------------------

function enableMidi() {
  WebMidi.enable(function (err) {
    if (err) console.log("An error occurred", err);

    //---------------------INPUT--------------------

    var liste = '';
    var taille = WebMidi.inputs.length;
    var i, num;
    var numStr = '0';

    if(taille == 0) {
      window.alert("No MIDI input device detected.");
      disableMidi();
      return;
    }

    for(let i = 0; i < taille; i++) {
      num = i+1;
      var name = WebMidi.inputs[i].name;
      //liste += '   ' + num.toString() + '   -   ' + name + '\n';
      if(name.includes('Keylinder input')) {
        if(!WebMidi.inputs[i].hasListener('noteon',      'all', handleScale)) {
          WebMidi.inputs[i].addListener('noteon',        'all', handleScale);
        }
        console.log('Input ok');
      }
    }

    //--------------------OUTPUT--------------------

    liste = '';
    //taille = WebMidi.outputs.length;
    numStr = '0';

    if(taille == 0) {
      window.alert("No MIDI output device detected.");
      synth = new PolySynth(6);
      return;
    }

    num = 1;
    for(let i = 0; i < taille; i++) {
      var name = WebMidi.outputs[i].name;
        //liste += '   ' + num.toString() + '   -   ' + name + '\n';
        num++;
      if(name.includes('Keylinder output')) {
        keylinderOutput = WebMidi.outputs[i];
        midi = 1;
        console.log('Output ok');
      }
    }
  },true);
}

//--------------------EVENTS--------------------

function handleScale(e) {
  fundamental = e.note.number;
  if(fundamental == 84) return;
  let nndx = 12-floor(fundamental/7)+floor(ndx/12)*12;
  if(ndx - nndx > 5) ndx = nndx + 12;
  else if(nndx - ndx > 6) ndx = nndx - 12;
  else ndx = nndx;
}

function disableMidi() {
  midi = 0;

  for(let i = 0; i < WebMidi.inputs.length; i++) {
    WebMidi.inputs[i].removeListener();
  }

  WebMidi.disable();

  //midiButton.color  = white;
  //midiButton.stroke = black;
}

//----------------------------------------------------------------------------
//                        Pitch detection
//----------------------------------------------------------------------------

/*function autoCorrelate( buf, sampleRate ) {
          var SIZE = buf.length;
      var MAX_SAMPLES = Math.floor(SIZE/2);
          var best_offset = -1;
      var best_correlation = 0;
      var rms = 0;
      var foundGoodCorrelation = false;
      var correlations = new Array(MAX_SAMPLES);

for (var i=0;i<SIZE;i++) {
	var val = buf[i];
	rms += val*val;
}
rms = Math.sqrt(rms/SIZE);
if (rms<0.01) // not enough signal
	return -1;

var lastCorrelation=1;
for (var offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
	var correlation = 0;

	for (var i=0; i<MAX_SAMPLES; i++) {
		correlation += Math.abs((buf[i])-(buf[i+offset]));
	}
	correlation = 1 - (correlation/MAX_SAMPLES);
	correlations[offset] = correlation; // store it, for the tweaking we need to do below.
	if ((correlation>GOOD_ENOUGH_CORRELATION) && (correlation > lastCorrelation)) {
		foundGoodCorrelation = true;
		if (correlation > best_correlation) {
			best_correlation = correlation;
			best_offset = offset;
		}
	} else if (foundGoodCorrelation) {
		// short-circuit - we found a good correlation, then a bad one, so we'd just be seeing copies from here.
		// Now we need to tweak the offset - by interpolating between the values to the left and right of the
		// best offset, and shifting it a bit.  This is complex, and HACKY in this code (happy to take PRs!) -
		// we need to do a curve fit on correlations[] around best_offset in order to better determine precise
		// (anti-aliased) offset.

		// we know best_offset >=1,
		// since foundGoodCorrelation cannot go to true until the second pass (offset=1), and
		// we can't drop into this clause until the following pass (else if).
		var shift = (correlations[best_offset+1] - correlations[best_offset-1])/correlations[best_offset];
		return sampleRate/(best_offset+(8*shift));
	}
	lastCorrelation = correlation;
}
if (best_correlation > 0.01) {
	// console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
	return sampleRate/best_offset;
}
return -1;
   //	var best_frequency = sampleRate/best_offset;
 }*/
