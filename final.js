// shim layer with setTimeout fallback
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       || 
          window.webkitRequestAnimationFrame || 
          window.mozRequestAnimationFrame    || 
          window.oRequestAnimationFrame      || 
          window.msRequestAnimationFrame     || 
          function(/* function */ callback, /* DOMElement */ element){
            window.setTimeout(callback, 1000 / 60);
          };
}());

(function () {
    nameP1 = window.prompt("Digite seu nome");

    hiScore = 0;
    hiScoreName = '';
    background = '';
    const hiScoreRef = firebase.database().ref('hiScore');
    const backGroundRef = firebase.database().ref('backGround');

    hiScoreRef.on('value', function(snapshot) {
        hiScore = snapshot.val().value;
	    hiScoreName = snapshot.val().name;
    });

    backGroundRef.on('value', function(snapshot) {
        background = snapshot.val();
        canvas.style = `display: block; background: #eee8aa url(${snapshot.val()}) 0 0;`;
    });

    var canvas = document.getElementById('snakeCanvas'),
        ctx = canvas.getContext('2d'),
        score = 0,
        input = { left: false, right: false, up: false, down: false},
        mouse = {x: 0, y: 0, click: false}; 

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    // check for keypress and set input properties
    window.addEventListener('keydown', function(e) {
       switch (e.keyCode) {
            case 37: input.left = true; break;                            
            case 39: input.right = true; break;      
            case 38: input.up = true; break;
            case 40: input.down = true; break;                      
       } 
    }, false);

    window.addEventListener('touchstart', function(e) {
        mouse.x = e.layerX;
        mouse.y = e.layerY;
        mouse.click = true;
     }, false);
     
     window.addEventListener('mousedown', function(e) {
        mouse.x = e.layerX;
        mouse.y = e.layerY;
        mouse.click = true;
     }, false);  


    // a collection of methods for making our mark on the canvas
    var draw = {
        clear: function () {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        },    

        rect: function (x, y, w, h, col) {
            ctx.fillStyle = col;
            ctx.fillRect(x, y, w, h);
        },
       
        circle: function (x, y, radius, col) {
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI*2, true);
            ctx.closePath();
            ctx.fill();
        },
        
		triangle: function (x, y, w, h, dir, col) {
			var angle;

			switch(dir) {
				case 0: angle =  90; break;		// up
				case 1: angle =  180; break;	// right
				case 2: angle =  270; break;	// down
				case 3: angle =  0; break;		// left
			}

            ctx.fillStyle = col;
            ctx.save();
            ctx.translate(x + (w/2), y + (h/2));
            ctx.rotate(angle * Math.PI/180);
            ctx.beginPath();
            x = (w /2) * -1;
            y = (h /2) * -1;
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + h);
            ctx.lineTo(x + w, y + (h/2));
            ctx.fill();
            ctx.restore();
		},

		pattern: function (x, y, w, h){
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.moveTo(x, y + (h/2));
            ctx.lineTo(x + (w /2), y);
            ctx.lineTo(x + (w /2), y + h);
            ctx.lineTo(x + w, y + (h/2));
            ctx.fill();
        },

        text: function (str, x, y, size, col) {
            ctx.font = 'bold ' + size + 'px Aldrich, sans-serif';
            ctx.fillStyle = col;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;

            ctx.fillText(str.toLowerCase(), x, y);

            ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
        }
    };

    // main snake class
    var Snake = function() {

        this.init = function() {

            this.dead = false;
            this.len = 0; // length of the snake (number of segments)
            this.speed = 2; // amount of pixels moved per frame
            this.history = []; // we'll need to keep track of where we've been
            this.dir = [    // the four compass points in which the snake moves
                [0, -1],    // up
                [1, 0],     // right
                [0, 1],     // down
                [-1, 0]     // left
            ];
            this.currentDir = 2;    // i.e. this.dir[2] = down

            this.x = 100;
            this.y = 100;
            this.w = this.h = 16;
            this.col = 'darkgreen';
        };
  
        this.move = function() {

            if (this.dead) {
                return;
            }

            if(mouse.click){
                if((mouse.x > (canvas.width / 2)) && this.currentDir != 3 && this.currentDir != 1){
                    this.currentDir = 1;
                }else if((mouse.x < (canvas.width / 2)) && this.currentDir != 1 && this.currentDir != 3){
                    this.currentDir = 3;
                }else if((mouse.y < (canvas.height / 2)) && this.currentDir != 2 && this.currentDir != 0){
                    this.currentDir = 0;
                }else if((mouse.y > (canvas.height / 2)) && this.currentDir != 0 && this.currentDir != 2){
                    this.currentDir = 2;
                }
            }

            // check if a button has been pressed 
            if (input.left && this.currentDir != 1) {
                this.currentDir = 3;
            } else if (input.right && this.currentDir != 3) {
                this.currentDir = 1;
            } else if (input.up && this.currentDir != 2) {
                this.currentDir = 0;
            } else if (input.down && this.currentDir != 0) {
                this.currentDir = 2;
            }

            // check if out of bounds
            if (this.x < 0){
                this.x = (canvas.width - this.w)
            }else if(this.x > (canvas.width - this.w)){
                this.x = 0
            }else if(this.y < 0){
                this.y = (canvas.height - this.h)
            }else if(this.y > (canvas.height - this.h)){
                this.y = 0;
            } 

            // update position
            this.x += (this.dir[this.currentDir][0] * this.speed);
            this.y += (this.dir[this.currentDir][1] * this.speed);

            // store this position in the history array
            this.history.push({x: this.x, y: this.y, dir: this.currentDir});

        };

		this.draw = function () {

			var i, offset, segPos, col;

            // loop through each segment of the snake, 
            // drawing & checking for collisions
			for (i = 1; i <= this.len; i += 1) {

                // offset calculates the location in the history array
				offset = i * Math.floor(this.w / this.speed);
				offset = this.history.length - offset;
				segPos = this.history[offset];
 
                col = this.col;

                // reduce the area we check for collision, to be a bit
                // more forgiving with small overlaps
                segPos.w = segPos.h = (this.w - this.speed);

                if (i > 2 && i !== this.len && this.collides(segPos)) {
                    this.dead = true;
                    col = 'darkred'; // highlight hit segments
                }

                if (i === this.len) { // last segment = snake's tail
                    draw.triangle(segPos.x, segPos.y, this.w, this.h,
										segPos.dir, this.col);
                }
                else {
                    draw.rect(segPos.x, segPos.y, this.w, this.h, col);
                    draw.pattern(segPos.x, segPos.y, this.w, this.h);
                }
			}

            draw.rect(this.x, this.y, this.w, this.h, this.col); // draw head
			draw.rect(this.x + 4, this.y + 1, 3, 3, 'white');    // draw eyes	
			draw.rect(this.x + 12, this.y + 1, 3, 3, 'white');
		};

        this.collides = function(obj) {

            // this sprite's rectangle
            this.left = this.x;
            this.right = this.x + this.w;
            this.top = this.y;
            this.bottom = this.y + this.h;

            // other object's rectangle
            obj.left = obj.x;
            obj.right = obj.x + obj.w;
            obj.top = obj.y;
            obj.bottom = obj.y + obj.h;

            // determine if not intersecting
            if (this.bottom < obj.top) { return false; }
            if (this.top > obj.bottom) { return false; }
            if (this.right < obj.left) { return false; }
            if (this.left > obj.right) { return false; }
            // otherwise, it's a hit
            return true;
        };

    };

    var Apple = function() {
    
        this.x = 0;
        this.y = 0;
        this.w = 16;
        this.h = 16;
        this.col = '200, 0, 0';
        this.opacity = 1;
        this.replace = 0;   // game turns until we move the apple elsewhere

        this.draw = function() {

            if (this.replace === 0) { // time to move the apple elsewhere
                this.relocate();
            }

            this.opacity = (this.replace <= 100)
                ? this.replace / 100
                : 1;

                //Maça redonda
            // draw.circle(this.x + (this.w / 2), this.y + (this.h / 2), 
            //                 this.w / 2, 
            //                 'rgba(' + this.col + ', ' + this.opacity + ')');
            draw.rect((this.x + (this.w / 2)), (this.y + (this.h / 2)), 
            (this.w / 1.5), (this.h / 1.5),
            'rgba(' + this.col + ', ' + this.opacity + ')')
            this.replace -= 1;
        };

        this.relocate = function() {
            this.x = Math.floor(Math.random() * (canvas.width - this.w)); 
            this.y = Math.floor(Math.random() * (canvas.height -this.h)); 
            this.replace = Math.floor(Math.random() * 200) + 200; 
        };

    };

    // create an instance of the Snake class, called p1
    var p1 = new Snake();
    p1.init();
    // and let there be an apple 
    var apple = new Apple();
   
    (function loop() {

        var time, opacity, col;
        window.scrollTo(0, 0);

        draw.clear();
        p1.move();
        p1.draw();

        if (p1.collides(apple)) {
            score += 1;
            p1.len += 1;
            apple.relocate();
        }

        if (score > hiScore) {
            hiScore = score;
	    hiScoreName = nameP1;
            localStorage.hiScore = hiScore;
	    localStorage.hiScoreName = hiScoreName;
            firebase.database().ref('hiScore').set({name: nameP1, value: score});
        }

        apple.draw();
        draw.text('Score: '+score, 20, 20, 12, 'black');
        draw.text('Hi points: '+hiScore, 260, 20, 12, 'black');
	draw.text('Hi name: '+hiScoreName, 260, 30, 12, 'black');

        if (p1.dead === true) {
            time = new Date().getTime() * 0.002;
            opacity = Math.abs(Math.sin(time * 0.9));
            col = 'rgba(0, 0, 0, ' + opacity + ')';
            draw.text('Game Over',100, 200, 20, col); 

            if (input.right || input.left) {
                p1.init();
                score = 0;
            } 
        } 

        input.right = input.left = input.up = input.down = false;
        mouse.x = mouse.y = 0;
        mouse.click = false;
        requestAnimFrame(loop);

    }());

}());
