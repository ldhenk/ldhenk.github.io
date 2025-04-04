# Pre-theme ideas from previous compo:
 - arcade-style thing
 - platformer
 - creative expression
 - focus on music/sounds

# More pre-theme ideas
 - Play with the canvas shape a bit
 - Nothing but Juice, just take something
   really simple and Juice it to the max
 - Layering music between modes (minor/major/creepy/serene/excited)

# Theme:
DEPTHS
 - underwater (obvs)
 - mine shafts
 - darkness, caves
 - psychological
 - Z-dimension (length, breadth, depth)
 - scrolling depth (game the system with funky idea)
    - mouse movement around obstacles?
    - downward platformer, scroll bar gives you an idea of progress
       - scrollbar decelerates!
       - fixed-position canvas + page scrolling in the background could let us do some tricky stuff
       - OSs don't show the scrollbar anymore, even for overflow: scroll;, and a fake scrollbar
         wouldn't be as cool...
       - ok, ignore the scrollbar
       - camera keeps up with the player, too much speed pulls you below the viewport and you die
          - or maybe just have fall damage
       - what if you reach the bottom and we animate in ANOTHER scroll bar from the right?
          - Then you scroll "past" the current "inner" scroll pane
       - This is a terrible idea you don't actually have any gameplay.
          - YOU DON"T CONTROL THE CHARACTER YOU CONTROL THE VIEWPORT
          - Scroll manually to "track" the player
             - player dies if they exit the viewport
             - player moves consistently ~downward~ UPWARDS
             - Decompression - THE BENDS
             - Throw something in front of the scrollbar and
               whatever to intercept scroll wheel events?
                - That'll also stop dragging of the
                  scrollbar, how do we continue to allow that?
                   - Most people don't drag the scrollbar.  If using
                     mousewheel goes fast enough, most won't want to.
                   - Scroll bar on most devices won't exceed a certain
                     size.  Cover _most_ of the screen and as long as
                     you're not unlucky both scrolling and dragging will work
             - bad bad bad, it HAS to be real scrolling, or else browsers will fight you on this.
                - canvas can still follow you down, it just needs to be smart
                   - bad bad bad, JS scroll events == jitter
                - TWO canvases, embedded in the page so they scroll properly with it, each the height
                  of the viewport, "step" one past the other as you scroll past them
                - ONE canvas, centered around the character but the area around it blends into
                  the background color to disguise the "seam"
                   - We can do the "circle" clipping trick to make it even sneakier
             - Low oxygen: go faster, red pulsing bends: go slower, dodging obstacles on the way up
       - OK but what is the actual GAMEPLAY
          - dodging things?
          - maze?
          - fighting things?
          - harpoon?
             - Shooting it fends things off but can send you flying downwards
        - When you reach the surface, everything is dead of nuclear fallout
 - zooming depth
 - depths of space?  Bit of a stretch...
    - Launch a rocket downwards into space...
 - START in the depths and work towards the surface
 - That satellite isolation idea?



# TODO

 - see if there's a way to request always-visible scroll bars
    - You can't!
 - TEST ON WINDOWS



