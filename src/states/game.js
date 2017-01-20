let gameState = (game) => {
    "use strict";
    let textConfig = {
        font: "16px Arial",
        fill: "#E8EAF6",
        align: "center",
        wordWrap: true,
        wordWrapWidth: 600
    }
};

gameState.prototype = {
    init: function () {
        this.player = null;
        this.aliens = null;
        this.bullets = null;
        this.bulletTime = 0;
        this.cursors = null;
        this.fireButton = null;
        this.explosions = null;
        this.starfield = null;
        this.score = 0;
        this.scoreString = '';
        this.scoreText = null;
        this.lives = null;
        this.enemyBullet = null;
        this.firingTimer = 0;
        this.stateText = null;
        this.livingEnemies = [];
    },

    preload: function () {
        this.game.load.image('bullet', 'assets/example/bullet.png');
        this.game.load.image('enemyBullet', 'assets/example/enemy-bullet.png');
        this.game.load.spritesheet('invader', 'assets/example/invader32x32x4.png', 32, 32);
        this.game.load.image('ship', 'assets/example/player.png');
        this.game.load.spritesheet('kaboom', 'assets/example/explode.png', 128, 128);
        this.game.load.image('starfield', 'assets/example/starfield.png');
        this.game.load.image('background', 'assets/example/background2.png');
    },

    create: function () {

        this.game.physics.startSystem(Phaser.Physics.ARCADE);

        //  The scrolling starfield background
        this.starfield = this.game.add.tileSprite(0, 0, 800, 600, 'starfield');

        //  Our bullet group
        this.bullets = this.game.add.group();
        this.bullets.enableBody = true;
        this.bullets.physicsBodyType = Phaser.Physics.ARCADE;
        this.bullets.createMultiple(30, 'bullet');
        this.bullets.setAll('anchor.x', 0.5);
        this.bullets.setAll('anchor.y', 1);
        this.bullets.setAll('outOfBoundsKill', true);
        this.bullets.setAll('checkWorldBounds', true);

        // The enemy's bullets
        this.enemyBullets = this.game.add.group();
        this.enemyBullets.enableBody = true;
        this.enemyBullets.physicsBodyType = Phaser.Physics.ARCADE;
        this.enemyBullets.createMultiple(30, 'enemyBullet');
        this.enemyBullets.setAll('anchor.x', 0.5);
        this.enemyBullets.setAll('anchor.y', 1);
        this.enemyBullets.setAll('outOfBoundsKill', true);
        this.enemyBullets.setAll('checkWorldBounds', true);

        //  The hero!
        this.player = this.game.add.sprite(400, 500, 'ship');
        this.player.anchor.setTo(0.5, 0.5);
        this.game.physics.enable(this.player, Phaser.Physics.ARCADE);

        //  The baddies!
        this.aliens = this.game.add.group();
        this.aliens.enableBody = true;
        this.aliens.physicsBodyType = Phaser.Physics.ARCADE;

        this.createAliens();

        //  The score
        this.scoreString = 'Score : ';
        this.scoreText = this.game.add.text(10, 10, this.scoreString + this.score, { font: '34px Arial', fill: '#fff' });

        //  Lives
        this.lives = this.game.add.group();
        this.game.add.text(this.game.world.width - 100, 10, 'Lives : ', { font: '34px Arial', fill: '#fff' });

        //  Text
        this.stateText = this.game.add.text(this.game.world.centerX, this.game.world.centerY,' ', { font: '84px Arial', fill: '#fff' });
        this.stateText.anchor.setTo(0.5, 0.5);
        this.stateText.visible = false;

        for (let i = 0; i < 3; i++)
        {
            let ship = this.lives.create(this.game.world.width - 100 + (30 * i), 60, 'ship');
            ship.anchor.setTo(0.5, 0.5);
            ship.angle = 90;
            ship.alpha = 0.4;
        }

        //  An explosion pool
        this.explosions = this.game.add.group();
        this.explosions.createMultiple(30, 'kaboom');
        this.explosions.forEach(this.setupInvader, this);

        //  And some controls to play the game with
        this.cursors = this.game.input.keyboard.createCursorKeys();
        this.fireButton = this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    },

    createAliens: function () {
        for (let y = 0; y < 4; y++)
        {
            for (let x = 0; x < 10; x++)
            {
                let alien = this.aliens.create(x * 48, y * 50, 'invader');
                alien.anchor.setTo(0.5, 0.5);
                alien.animations.add('fly', [ 0, 1, 2, 3 ], 20, true);
                alien.play('fly');
                alien.body.moves = false;
            }
        }

        this.aliens.x = 100;
        this.aliens.y = 50;

        //  All this does is basically start the invaders moving. Notice we're moving the Group they belong to, rather than the invaders directly.
        let tween = this.game.add.tween(this.aliens).to( { x: 200 }, 2000, Phaser.Easing.Linear.None, true, 0, 1000, true);

        //  When the tween loops it calls descend
        tween.onLoop.add(this.descend, this);
    },

    setupInvader: function (invader) {
        invader.anchor.x = 0.5;
        invader.anchor.y = 0.5;
        invader.animations.add('kaboom');
    },

    descend: function () {
        this.aliens.y += 10;
    },

    update: function () {
        //  Scroll the background
        this.starfield.tilePosition.y += 2;

        if (this.player.alive)
        {
            //  Reset the player, then check for movement keys
            this.player.body.velocity.setTo(0, 0);

            if (this.cursors.left.isDown)
            {
                this.player.body.velocity.x = -200;
            }
            else if (this.cursors.right.isDown)
            {
                this.player.body.velocity.x = 200;
            }

            //  Firing?
            if (this.fireButton.isDown)
            {
                this.fireBullet();
            }

            if (this.game.time.now > this.firingTimer)
            {
                this.enemyFires();
            }

            //  Run collision
            this.game.physics.arcade.overlap(this.bullets, this.aliens, this.collisionHandler, null, this);
            this.game.physics.arcade.overlap(this.enemyBullets, this.player, this.enemyHitsPlayer, null, this);
        }
    },

    collisionHandler: function (bullet, alien) {
        "use strict";
        //  When a bullet hits an alien we kill them both
        bullet.kill();
        alien.kill();

        //  Increase the score
        this.score += 20;
        this.scoreText.text = this.scoreString + this.score;

        //  And create an explosion :)
        let explosion = this.explosions.getFirstExists(false);
        explosion.reset(alien.body.x, alien.body.y);
        explosion.play('kaboom', 30, false, true);

        if (this.aliens.countLiving() == 0)
        {
            this.score += 1000;
            this.scoreText.text = this.scoreString + this.score;

            this.enemyBullets.callAll('kill',this);
            this.stateText.text = " You Won, \n Click to restart";
            this.stateText.visible = true;

            //the "click to restart" handler
            this.game.input.onTap.addOnce(this.restart,this);
        }
    },

    enemyHitsPlayer: function (player,bullet) {

        bullet.kill();

        this.live = this.lives.getFirstAlive();

        if (this.live) {
            this.live.kill();
        }

        //  And create an explosion :)
        let explosion = this.explosions.getFirstExists(false);
        explosion.reset(player.body.x, player.body.y);
        explosion.play('kaboom', 30, false, true);

        // When the player dies
        if (this.lives.countLiving() < 1) {
            player.kill();
            this.enemyBullets.callAll('kill');

            this.stateText.text = " GAME OVER \n Click to restart";
            this.stateText.visible = true;

            //the "click to restart" handler
            this.game.input.onTap.addOnce(this.restart, this);
        }
    },


    enemyFires: function () {

        //  Grab the first bullet we can from the pool
        this.enemyBullet = this.enemyBullets.getFirstExists(false);

        this.livingEnemies.length=0;

        this.aliens.forEachAlive(function(alien){

            // put every living enemy in an array
            this.livingEnemies.push(alien);
        }, this);

        if (this.enemyBullet && this.livingEnemies.length > 0)
        {

            let random = this.game.rnd.integerInRange(0, this.livingEnemies.length-1);

            // randomly select one of them
            let shooter = this.livingEnemies[random];
            // And fire the bullet from this enemy
            this.enemyBullet.reset(shooter.body.x, shooter.body.y);

            this.game.physics.arcade.moveToObject(this.enemyBullet, this.player,120);
            this.firingTimer = this.game.time.now + 2000;
        }

    },

    fireBullet: function () {

         //  To avoid them being allowed to fire too fast we set a time limit
        if (this.game.time.now > this.bulletTime)
        {
            //  Grab the first bullet we can from the pool
            this.bullet = this.bullets.getFirstExists(false);

            if (this.bullet)
            {
                //  And fire it
                this.bullet.reset(this.player.x, this.player.y + 8);
                this.bullet.body.velocity.y = -400;
                this.bulletTime = this.game.time.now + 200;
            }
        }

    },

    resetBullet: function (bullet) {
        //  Called if the bullet goes out of the screen
        bullet.kill();
    },

    restart: function () {
        //  A new level starts

        //resets the life count
        this.lives.callAll('revive');
        //  And brings the aliens back from the dead :)
        this.aliens.removeAll();
        this.createAliens();

        //revives the player
        this.player.revive();
        //hides the text
        this.stateText.visible = false;

    }
}

module.exports = gameState;