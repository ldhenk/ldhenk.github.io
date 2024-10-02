# Pre-theme ideas:
 - arcade-style thing
 - platformer
 - creative expression
 - focus on music/sounds


THEME: Tiny Creatures
 - dwarf-fortress like thing but with hundreds of tiny ants
 - grey goo
 - germs/infection
 - arcade schmup
 - little cubes
 - creature creation
 - platformer, controls move a large swarm of things
 - top-down controls move a large swarm of things
 - termites
 - Assemble "living" things from every day objects
 - ants, man.  ants

 - underground ant farm
    - dig tunnels
    - acquire resources
    - breed more ants
    - colored items
       - vegetables (green), stone (gray), wood (tan), amber/sap (yellow), make
         something up for blue.  Glowworm extract, idk.  blood/corpses (red)?
       - water (blue), except hard to think of mechanics for that
       - Soil needs to be a super neutral color, or else be stainable
    - build soil out by digging it from other places
       - surface "hill" acts as soil cache

 - What if it's the above one, but you're _in_ the ant farm as a player character
    - the ants could be enemies
    - or you could be an ant, IDK
    - one giant playing field with the option to zoom out and see the whole thing
    - digging, mining, crafting, etc
    - so terraria, but with ants?
    - crafting should be really simple/nonexistent
       - dirt is hand-diggable
       - grass => bucket
       - grass => fibers (green material)
       - small pebble => "tool" (breaks things faster)
       - tool breaks stones into pebbles
       - pebbles => gravel (gray material)
       - bucket => water droplet (blue material)
          - water droplet == ladder
       - twig => plank => (yellow material)
       - ant => ant meat (red material)
    - start with a large binary buffer
       - how quickly can we get a pre-drawn image converted to a binary buffer?
          - stb_image?
       - could also "randomly generate"
    - two inventory slots
       - "tool" slot holds single pebble
       - "regular" slot holds items
       - C to craft items in regular slot.  Discards any remainder on the ground.
       - Q to drop all items in regular slot
       - tool can be thrown, to use
          - in impact, breaks things and kills things
    - darkness mechanic?
       - 
    - if ants are hostile, they shouldn't kill you, just do something annoying
       - make you drop your items, then scurry away.
    - There needs to be a progression
       - start above-ground
       - find pebbles below certain level
       - pebbles required to kill ants?
       - what is the GOAL? why would you go downwards?
       - gold?  Searching for something?
       - what is the OBSTACLE?  what stops you from going downwards?
          - why the ants, of course...
          - ants send you back to the surface
             - this incentivizes building paths downward, not just yoloing it
          - need something to prevent ants from spawning
          - glow-worm blood?
             - glow worms show up on/near the surface, killing one creates
               eggs, which themselves glow
    - grass drops grass seed when fully grown, can be used to plant more grass 



If you have time:
 - music
 - walking animation
 - better place/break positioning?
 - Kill ants for red item
    - use for the red item?
    - reduce dig cooldown
    - destroy boulders?
 - world border should be solid black









 - "platformer"
    - move a large swarm of things with arrows or mouse
    - devour obstacles satisfyingly
    - enemies consist of similarly-sized swarms?

 - First person ant hill game
    - walk around among ants in procedurally generated caves

 - top-down "shooter" whith large numbers of small (3x3 pixel maybe) enemies
    - let the player design the enemy
    - weapon is flamethrower, which kills 10s at once

