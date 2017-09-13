/**
 * 工具函数
 * @type {Object}
 */
const utils = {
  getJSON (uri, callback) {
    const xhr = new XMLHttpRequest()
    xhr.open('get', uri)
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4 && xhr.status === 200) {
        callback(JSON.parse(xhr.responseText))
      }
    }
    xhr.send()
  },
  loadScript (src, cb, error) {
    const head = document.getElementsByTagName('head')[0]
    const script = document.createElement('script')
    script.type = 'text/javascript'
    head.appendChild(script)
    script.src = src
    script.onload = cb
    script.onerror = error
  },
  findIndex (find, arr, val) {
    let index = -1
    for (let i = 0, l = arr.length; i < l; i++) {
      if (find === arr[i][val]) {
        index = i
      }
    }
    return index
  }
}

/**
 * 城市选择组件的辅助对象
 * 包括uid,城市码，发布订阅模式
 * @type {Object}
 */
const __CityHelper__ = {
  code4: {
    lock: false,
    cityData: [],
    subList: [],
    _finish: false,
    get finish () {
      return this._finish
    },
    set finish (newVal) {
      this._finish = newVal
      __CityHelper__.trigger(4)
    }
  },
  code6: {
    lock: false,
    cityData: [],
    subList: [],
    _finish: false,
    get finish () {
      return this._finish
    },
    set finish (newVal) {
      this._finish = newVal
      __CityHelper__.trigger(6)
    }
  },
  uid: 0,
  trigger (code) {
    const list = this[`code${code}`].subList
    for (const i in list) {
      list[i].render()
    }
  },
  defaultId: [{
    name: 'province',
    zh: '省'
  }, {
    name: 'city',
    zh: '市'
  }, {
    name: 'district',
    zh: '区'
  }],
  isCN: new RegExp('^[\u4E00-\u9FA5]+$'),
  totalCN (arr) {
    return arr.every(val => __CityHelper__.isCN.test(val))
  },
  together (func) {
    func(this.province)
    if (this.city) {
      func(this.city)
    }
    if (this.district) {
      func(this.district)
    }
  }
}

class City {

  /**
   * 参数
   * @param  {String}   el       容器的选择器
   * @param  {Number}   code     城市码的位数
   * @param  {Function} created  创建时的函数
   * @param  {Boolean}  location 是否需要定位功能
   * @param  {Number}   deep     选择器的范围， 1： 省。2：省市。3：省市区
   * @param  {Boolean}  disabled    定位成功后是否锁定select，不予点击
   * @param  {Boolean}  pseudo      是否需要伪类
   * @param  {Array}    pseudoClass 伪类的class
   * @param  {Function} fail     定位失败时执行的函数
   * @param  {Function} success  定位成功时执行的函数
   * @return {City}     City     生成的函数
   */
  constructor ({
    el = 'body',
    code = 4,
    deep = 2,
    location = false,
    disabled = false,
    textOnly = true,
    pseudo = false,
    pseudoClass = [],
    fail = () => {},
    success = () => {},
  } = {}) {
    this.el = document.querySelector(el)
    this.code = code
    this.deep = deep
    if (this.code === 4 && this.deep > 2) {
      this.deep = 2
    }
    this.location = location
    if (this.location) {
      if (this.code !== 4) {
        throw new Error('使用定位时，Code必须为4')
      }
    }
    this.fail = fail
    this.success = success
    this.disabled = disabled
    this.textOnly = textOnly
    this.pseudo = pseudo
    this.pseudoClass = pseudoClass
    this.cityData = []
    this.province = null
    this.city = null
    this.district = null
    this.uid = __CityHelper__.uid += 1
    this.name = `__City${this.uid}__${window.location.pathname}__`
    this.geoTimes = 0
  }

  /**
   * 初始化选择
   */
  start () {
    const code = 'code' + this.code
    const codeObj = __CityHelper__[code]
    codeObj.subList.push(this)
    if (!codeObj.lock) {
      // codeObj.lock = true
      utils.getJSON(`./../../static/json/city${this.code}.json`, data => {
        codeObj.cityData = data
        codeObj.finish = true
      })
    }
    this.renderDefault()
  }

  /**
   * 拿到城市数据后，开始渲染选择器
   * @return {[type]} [description]
   */
  render (from) {
    const code = 'code' + this.code
    this.cityData = __CityHelper__[code].cityData
    this.initProvince(from)
    if (this.location && this.geoTimes === 0) {
      this.geoTimes += 1
      this.initGeolocation()
    }
  }

  /**
   * 未拿到城市数据时，选择默认界面
   */
  renderDefault () {
    const defaultId = __CityHelper__.defaultId
    for (let i = 0; i < this.deep; i++) {
      const { name, zh } = defaultId[i]
      const id = `__${name}1__`
      const select = document.createElement('select')
      select.setAttribute('id', id)
      select.innerHTML = `<option value="-1">选择所在${zh}</option>`
      this.el.appendChild(select)
      if (this.pseudo) {
        const eleI = document.createElement('i')
        eleI.className = this.pseudoClass[i]
        this.el.appendChild(eleI)
      }
      this[name] = document.getElementById(id)
    }
  }

  /**
   * 事件添加
   * @param {DOM}   el       要添加事件的DOM元素
   * @param {Event}   event    事件
   * @param {Function} callback 回调函数
   */
  addEvent (el, event, callback) {
    // 能避免同一事件被添加多次
    el[`on${event}`] = callback
  }

  /**
   * 渲染具体的选择器
   * @param  {Array} arr 城市列表
   * @return {String}     生成后的HTML字符串
   */
  renderOption (arr) {
    let option = ''
    for (let i = 0; i < arr.length; i++) {
      option += `<option value="${i}">${arr[i].name}</option>`
    }
    return option
  }

  /**
   * 初始化城市选择
   */
  initProvince (from) {
    // 选择某一个省后便删除请选择省的提示
    let isChange = false
    const provSelect = this.renderOption(this.cityData)
    if (from === 'geoFailed') {
      this.province.innerHTML = provSelect
    } else {
      this.province.innerHTML = this.province.innerHTML += provSelect
    }

    this.addEvent(this.province, 'change', e => {
      const value = e.target.value
      if (!isChange) {
        isChange = true
        this.province.innerHTML = provSelect
        this.province.value = value
      }
      this.initCity(Number(this.province.value))
    })
    // if (this.province.value >= 0) {
    //   this.initCity(Number(this.province.value))
    // }
  }

  /**
   * 初始化城市选择
   * @param  {Number} prov 省在城市数据的位置
   */
  initCity (prov) {
    const citySelect = this.renderOption(this.cityData[prov].citys)
    this.city.innerHTML = '<option value="-1">选择所在市</option>' + citySelect
    if (this.district) {
      this.initDistrict(prov, Number(this.city.value))
      this.addEvent(this.city, 'change', e => {
        this.initDistrict(prov, Number(e.target.value))
      })
    }
  }

  /**
   * 初始化区选择
   * @param  {Number} prov 省在城市数据的位置
   * @param  {Number} city 市在城市数据的位置
   */
  initDistrict (prov, city) {
    const distSelect = this.renderOption(this.cityData[prov].citys[city].citys)
    this.district.innerHTML = '<option value="-1">选择所在区</option>' + distSelect
  }

  /**
   * 获取当前选择的值
   * @return {Array | Boolean}
   */
  getValue () {
    function byJSON () {
      const result = []
      const provValue = Number(this.province.value)
      // 未选择状态
      if (provValue === -1) {
        return false
      }
      const province = this.cityData[provValue]
      result.push({
        name: province.name,
        code: province.code,
        value: provValue
      })
      let cityValue
      let city
      if (this.city) {
        cityValue = Number(this.city.value)
        if (cityValue == -1) {
          return false
        }
        city = this.cityData[provValue].citys[cityValue]
        result.push({
          name: city.name || null,
          code: city.code,
          value: cityValue
        })
      }
      if (this.district) {
        const distValue = Number(this.district.value)
        const district = this.cityData[provValue].citys[cityValue].citys[distValue]
        result.push({
          name: district.name,
          code: district.code,
          value: distValue
        })
      }
      return result
    }
    function byBackEnd () {
      const result = []
      const isCN = __CityHelper__.isCN
      __CityHelper__.together.call(this, place => {
        if (!isCN.test(place.value)) {
          const placeTemp = this.cityData[place.value]
          result.push({
            name: placeTemp.name,
            code: placeTemp.code,
            value: place.value
          })
        } else {
          result.push({
            name: place.value,
            code: undefined,
            value: place.value
          })
        }
      })
      return result
    }
    const isCN = __CityHelper__.isCN
    let result
    if (isCN.test(this.province.value) || isCN.test(this.city.value)) {
      result = byBackEnd.call(this)
    } else {
      result = byJSON.call(this)
    }
    return result
  }

  /**
   * 保存选择的值至localstorage
   */
  saveValue () {
    const result = this.getValue()
    if (result === false) {
      window.alert('选择未完成！')
      return
    }
    const value = result.map(val => val.name)
    window.localStorage.setItem(this.name, value)
  }

  /**
   * 设置选择器的值
   * 如果不传参数，则默认从localstorage中取
   * @param {Array} value 省市区在城市数据中的位置
   */
  setValue (value) {
    if (!value) {
      value = window.localStorage.getItem(this.name)
      if (value === 'false') return
    }
    value = value.split(',')

    // 传入的字符串全部为数字
    if (value.every(val => val == Number(val))) {
      byNumber.call(this, value)
      return
    }
    const posArr = []

    const provPos = utils.findIndex(value[0], this.cityData, 'name')
    if (provPos === -1) {
      byCN.call(this, value)
      return
    }
    posArr.push(provPos)
    if (this.city && value[1]) {
      const cityPos = utils.findIndex(value[1], this.cityData[provPos].citys, 'name')
      if (cityPos === -1) {
        byCN.call(this, value)
        return
      }
      posArr.push(cityPos)
    }

    if (this.district && value[2]) {
      const distPos = utils.findIndex(value[2], this.cityData[provPos][cityPos].citys, 'name')
      if (distPos == -1) {
        byCN.call(this, value)
        return
      }
      posArr.push(cityPos)
    }
    this.setValue(posArr.join(','))

    function byNumber (value) {
      // 触发省级选择器的函数，删除选择某个省
      if (this.province.value === '-1') {
        this.province.onchange({
          target: {
            value: value[0]
          }
        })
      } else {
        this.province.value = value[0]
      }
      if (this.city && value[1]) {
        this.initCity(value[0])
        this.city.value = value[1]
      }
      if (this.district && value[2]) {
        this.initDistrict(value[0], value[1])
        this.district.value = value[2]
      }
    }

    function byCN (value) {
      let num = 0
      __CityHelper__.together.call(this, place => {
        const option = `<option value="${value[num]}">${value[num]}</option>`
        if (place.firstChild.innerText.indexOf('选择所在') >= 0) {
          place.removeChild(place.firstChild)
        }
        place.innerHTML = option + place.innerHTML
        num += 1
      })
    }
  }

  /**
   * 初始化定位程序
   */
  initGeolocation () {
    if (!window.navigator.geolocation) {
      window.alert('你的手机不支持定位！')
      geoFailed.call(this)
      return
    }
    const positionTip = '<option value="-1">定位中...</option>'
    __CityHelper__.together.call(this, place => {
      place.innerHTML = positionTip + place.innerHTML
      place.setAttribute('disabled', 'disabled')
    })
    /**
     * 检测字符串是否为中文
     * @type {RegExp}
     */
    const isCN = __CityHelper__.isCN

    /**
     * 定位成功的回调
     * @param  {Object} postion postions对象，具体看MDN
     */
    function success (postion) {
      const { latitude, longitude } = postion.coords
      const point = new BMap.Point(longitude, latitude)
      const gc = new BMap.Geocoder()
      gc.getLocation(point, result => {
        const { province, city } = result.addressComponents
        if (!isCN.test(province)) {
          geoFailed.call(this)
          return
        }
        if (this.textOnly) {
          this.success(province, city)
          this.setValue([province, city])
        } else {
          const provPos = utils.findIndex(province, this.cityData, 'name')
          if (this.provPos === -1) {
            geoFailed.call(this)
            return
          }
          const cityPos = utils.findIndex(city, this.cityData[provPos].citys, 'name')
          if (this.cityPos === -1) {
            geoFailed.call(this)
            return
          }
          this.success(province, city)
          this.setValue(`${provPos},${cityPos}`)
        }
        if (!this.disabled) {
          this.province.removeAttribute('disabled', 'disabled')
          if (this.city) {
            this.city.removeAttribute('disabled', 'disabled')
          }
        }
      })
    }

    /**
     * 定位失败时的回调函数
     * @param  {Error} e 失败原因
     */
    function geoFailed (e) {
      this.render('geoFailed')
      const defaultId = __CityHelper__.defaultId
      for (let i = 1; i <= this.deep; i++ ) {
        const select = this[`${defaultId[i-1].name}`]
        if (!select.firstChild.innerText.indexOf('选择所在') >= 0) {
          select.innerHTML = `<option value="-1">选择所在${defaultId[i-1].zh}</option>` + select.innerHTML
        }
        select.removeAttribute('disabled')
      }
      this.city.innerHTML = '<option value="-1">选择所在市</option>'
      this.fail()
    }

    /**
     * 定位选项
     * @type {Object}
     */
    const options = {
      enableHighAccuracy: true,
      timeout: 3000,
      maximumAge: 0
    }

    setTimeout(() => {
      if (this.province.firstChild.innerText === '定位中...') {
        window.alert('定位失败，请手动选择城市')
        geoFailed.call(this)
      }
    }, 3300)

    utils.loadScript('//api.map.baidu.com/getscript?v=2.0&ak=TpBG0mqZUzD8IWpKa6HvUAmU', () => {
      window.navigator.geolocation.getCurrentPosition(success.bind(this), geoFailed.bind(this), options)
    }, geoFailed.bind(this))
  }

}

export default City
