Component({
  properties: {
    quantity: {
      type: Number,
      value: 1,
      observer: function (newVal) {
        if (newVal < 1) {
          this.setData({ quantity: 1 })
        }
      }
    },
    min: {
      type: Number,
      value: 1
    },
    max: {
      type: Number,
      value: 99
    }
  },

  methods: {
    onMinus() {
      let quantity = this.data.quantity
      if (quantity > this.data.min) {
        quantity--
        this.setData({ quantity })
        this.triggerEvent('change', { quantity })
      } else {
        this.triggerEvent('min')
      }
    },

    onAdd() {
      let quantity = this.data.quantity
      if (quantity < this.data.max) {
        quantity++
        this.setData({ quantity })
        this.triggerEvent('change', { quantity })
      } else {
        this.triggerEvent('max')
      }
    },

    onInput(e) {
      let value = parseInt(e.detail.value) || 1
      if (value < this.data.min) value = this.data.min
      if (value > this.data.max) value = this.data.max
      this.setData({ quantity: value })
      this.triggerEvent('change', { quantity: value })
    }
  }
})
