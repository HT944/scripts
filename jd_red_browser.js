/*
京享红包模拟领取
==============Quantumult X==============
[task_local]
#京享红包浏览器模拟领取
cron "0 0,10,20 * * *" jd_jingfen.js, tag:京享红包模拟领取
JDPROXYURL为代理池网址，返回为单个代理，格式为ip:port，不设置也可以跑，但是可能有风险
JXHBCODE为京享红包的code值，https://u.jd.com/PdqJXrk
 */

const $ = new Env('京享红包模拟领取');
const puppeteer = require('puppeteer');
const got = require('got');
const tunnel = require('tunnel')
const notify = $.isNode() ? require('./sendNotify') : '';
// 此处从环境变量中读取多个值
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
const proxyUrl = $.isNode() ? (process.env.JDPROXYURL ? process.env.JDPROXYURL : ''):'';
let cookies = []
const jxhb_code =  $.isNode() ? (process.env.JXHBCODE ? process.env.JXHBCODE : 'PdqJXrk'):'PdqJXrk';
let ck = ''

if ($.isNode()) {
   Object.keys(jdCookieNode).forEach((item) => {
      cookies.push(jdCookieNode[item])
   })
   if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => { };
} else {
   cookies = [$.getdata('CookieJD'), $.getdata('CookieJD2'), ...jsonParse($.getdata('CookiesJD') || "[]").map(item => item.cookie)].filter(item => !!item);
}

!(async () => {
   let num = 0;
   let index = 0;
   for (let i = 0; i < cookies.length; i++) {
      index = index + 1;
      ck = cookies[i]

      $.UserName = decodeURIComponent(ck.match(/pt_pin=([^; ]+)(?=;?)/) && ck.match(/pt_pin=([^; ]+)(?=;?)/)[1])
      console.log(`\n*****开始【京东账号${index}】${$.UserName}****\n`);// 输出当前用户
      let proxyIp
      let success = false
      // console.log(shareUrls)
      let ls = ck.split(';').slice(0, 2)   // 调整为访问时所需的cookie格式
      // console.log(ls)
      let cks = []  // 可用的ck键值对
      for (let ck of ls) {
         let res = {}
         let pre = ck.split('=')
         res.name = pre[0]
         res.value = pre[1]
         res.domain = ".jd.com"
         cks.push(res)
      }
    for (let i = 0; i < 10; i++) {
        try {
            if(proxyUrl){
                proxyIp = await getIp()
                console.log("本次使用代理:" + proxyIp)
            }
            if(await browse(cks, proxyIp)){
                success = true
                break
            }  // 模拟用户访问京享红包并领取京享红包
            console.log(`第${i + 1}次模拟领取失败，正在重试！`)
        }
        catch (e) {
            console.log(e)
            console.log(`第${i + 1}次模拟领取失败，正在重试！`)
        }
    }
    if(!success){
        console.log("10次模拟失败，跳过该用户！")
    }
    }
   // 发送通知
   // if ($.isNode()) {
   //     await notify.sendNotify(`京东店铺锁y执行完成`, '所有用户浏览完毕！共浏览商品数量：' + num);
   // }

})()
   .catch((e) => {
      $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
   })
   .finally(() => {
      $.done();
   })


// 功能拆分


// 提取代理ip
async function getIp() {
   let ip = await got.get(proxyUrl, {
        timeout: {
            request: 10000
        }
    }).text()
    return ip;
}

// 浏览器模拟访问
async function browse(cks, proxyIp) {
    opt = {
         headless: true,  // 显示浏览器
         timeout: 30000,  // 超时时间
         ignoreHTTPSErrors: true,
         args: [
            '--disable-gpu',  // 关闭GPU硬件加速
            '--disable-dev-shm-usage',  // 创建临时文件共享内存
            '--disable-setuid-sandbox',  // uid沙盒
            '--no-first-run', // 没有设置首页。在启动的时候，就会打开一个空白页面。
            '--no-sandbox', // 沙盒模式
            `--window-size=${375},${800}`,  // 设置窗口大小
            '--no-zygote',
            '--single-process', // 单进程运行
            '--blink-settings=imagesEnabled=false',
            '--disable-features=AudioServiceOutOfProcess',
         ],
         executablePath: '/usr/bin/chromium-browser'
      }
    if(proxyIp){
        opt.args.push(`--proxy-server=${proxyIp}`) // 使用代理ip
    }
   const browser = await puppeteer.launch(opt);

   const page = await browser.newPage();
   await page.emulate(puppeteer.devices["iPhone X"])
   try{
       console.log("正在领取京享红包")
        await page.goto("https://u.jd.com/"+jxhb_code)
        await page.waitForTimeout(5000)
        await page.setCookie(...cks)
        await page.goto("https://u.jd.com/"+jxhb_code)
        await page.waitForTimeout(8000)
        // content = await page.content()
        // content = await page.plainText()
        content = await page.$eval('*', el => el.innerText)
        // console.log(content)
        // await page.screenshot({ path: 'example2.png' });
        if(!content.includes("今日机会已用完")){
            try{
                await page.click(".index-module__union-coupon-button___1grbK.index-module__animate-pulse___YnSfN")
                await page.waitForTimeout(8000)
                const prize = await page.$eval('.index-module__h1___1LsBb.index-module__wx___2_6Eh', el => el.textContent);
                console.log("领取成功:\t" + prize) 
            }
            catch(err){
                console.log(err)
                console.log("出现未知错误，领取失败")
                await page.screenshot({ path: 'error.png' });
                await browser.close()
                return false
            }
        }
        else{
            console.log("今日机会已用完")  
        }

   }
   catch(err){
       console.log("代理无效，领取失败")
        console.log(err)
        await browser.close()
        return false
   }
   await browser.close();
  return true
}


// prettier-ignore
function Env(t, e) { "undefined" != typeof process && JSON.stringify(process.env).indexOf("GITHUB") > -1 && process.exit(0); class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"), n = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(n, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }
