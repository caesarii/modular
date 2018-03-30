
define(['./cart', './inventory'], function(cart, inventory) {
    return {
        color: 'blue',
        addToCart: function() {
            inventory.decrement(this)
            cart.add(this)
        }
    }
})