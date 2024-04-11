

# THEME: Summoning

Ideas:
 - I like the idea in general of not doing any actual
   gameplay yourself, but operating through summoned proxies
    - But we'd need to be careful not to end up with a tower
      defense game (lol there'll probably be a lot of those...)
 - "Chain of summoning" where you play as the thing you summon, which
   summons the next thing, which you then play as, etc.
    - kind of a "recursion theme", sort of
 - Remember infectonator world dominator?
 - What if the game is a _single_ summons, and the challenge is
   performing the summoning?
 - **What** are we summoning?
    - robots
       - blueprints, factories, electricity
    - ghosts
       - graveyards, haunted houses, mediums, candles
    - zombies
       - spells, graveyards, disease
    - functions (what?)
       - more functions
    - processes
    - threads
    - genies
    - nethack monsters
       - scroll of Summon Monster
    - viruses
    - Cthulhu, Yogsothoth
       - Some weird game about
         interpreting necronomicon contents
    - Demons
       - Circles, candles, evil bibles
 - What if _you_ aren't summoning something, but the _enemy_ is?
    - Can imagine a boss-fight bullet-hell type thing, where enemy spawns
      are due to some exceptionally hard to hit demon/wizard thing
 - Conway's game of life puzzle
    - Puzzle requires an ending configuration, summon individual cells
      across turns to ensure the configuration is reached
    - I... actually kind of like this one.  Are we sure we want another puzzle
      game?  Is there a twist we could put on it that wouldn't be too hard
      given the time constraints?
       - I mean: WebGL first person room with tiles on the floor


 - webgl first person dark game searching for candles to put on summoning circle
    - Could you pull off a scary game?
    - Could you pull off making it mildly spooky?
       - Sound is super important for that and you are _not_ good with sound
    - Tricks people wouldn't bat an eye at:
       - very low res downscaling and "sharp" pixels (watch out for browser compatibility)
       - Dense black fog of war and lots of untextured surfaces
       - sfxr sound effects
       - readable "notes" scrawled in pixel art
       - cheap jump-scare at the end?
    - 3 candles
      1. Easy candle, no major spooks, maybe in a library with the "readable notes"
      2. Maze candle, minor spoopiness (tight spaces, creeping darkness, moving shadows),
         maybe a basement/cellar or hedge maze or something?
      3. Puzzle candle (something dead simple like a key fetch), I want the candle
         to move when you're not looking
          - visible through gap/window
          - approach requires view to be obstructed for a moment
          - gone once approached (blood splatter?)
          - exiting the "area" reveals it sitting on the floor near the exit ;)
          - leaving with the candle requires turning around somehow
          - squirrel-stapler-style stationary jumpscare
             - It only works in squirrel stapler because of the build up...
             - White noise on loop; builds in volume to build suspense
                - Best we can do without more music experience (damn!  Should have prepared more!)
    - Way too ambitious?  I think this would be doable with something
      like unity, but I am not well-versed.  Doing this manually in webgl
      would be _quite difficult_.  Remember:
       - textures
          - Last-minute pixel art let's gooooo
       - models (we _do_ have a .obj import thing from another project I worked on...)
          - We could also do the "Notch" trick of having all our maps secretly be textures
       - sounds
          - sfxr.  I want a droning white noise track which I don't
            know how to generate (can web audio help here?).
       - FPS controls
          - We have `Camera.js`, from the other project (also FPS controls aren't hard
            to do from scratch if that's what you want)
       - lighting
          - fog of war + distance-based point lights
       - camera position/rotation-dependent game events
 - There!  Damn satanists, never put the candles back when they're done with them.



 
