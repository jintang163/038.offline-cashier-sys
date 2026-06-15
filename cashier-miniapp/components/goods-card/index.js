Component({
  properties: {
    goods: {
      type: Object,
      value: {}
    },
    quantity: {
      type: Number,
      value: 0
    }
  },

  methods: {
    onAdd() {
      this.triggerEvent('add', { goods: this.data.goods })
    },

    onMinus() {
      this.triggerEvent('minus', { goods: this.data.goods })
    },

    onTap() {
      this.triggerEvent('tap', { goods: this.data.goods })
    }
  }
})
