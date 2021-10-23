import json
import os
import random
import re
import time

import requests

QL_PORT = os.environ.get("QL_PORT") or "5700"

username = ""
password = ""
token = ""

if username == "" or password == "":
    f = open("/ql/config/auth.json")
    auth = f.read()
    auth = json.loads(auth)
    username = auth["username"]
    password = auth["password"]
    token = auth["token"]
    f.close()


def gettimestamp():
    return str(int(time.time() * 1000))


def login(username, password):
    url = f"http://127.0.0.1:{QL_PORT}/api/login?t=%s" % gettimestamp()
    data = {"username": username, "password": password}
    r = s.post(url, data)
    s.headers.update({"authorization": "Bearer " + json.loads(r.text)["data"]["token"]})


def getitem(key):
    url = f"http://127.0.0.1:{QL_PORT}/api/envs?searchValue=%s&t=%s" % (key, gettimestamp())
    r = s.get(url)
    item = json.loads(r.text)["data"]
    return item


def generate_data(data_list: list, name):
    data = []
    for one in data_list:
        data_json = {
            "value": one,
            "name": name
        }
        data.append(data_json)
    return data


def insert(data, name="DPQDTK"):
    url = f"http://127.0.0.1:{QL_PORT}/api/envs?t=%s" % gettimestamp()
    s.headers.update({"Content-Type": "application/json;charset=UTF-8"})
    data = generate_data(data, name)
    r = s.post(url, json.dumps(data))
    if json.loads(r.text)["code"] == 200:
        return True
    else:
        return False


def delete(data):
    url = f"http://127.0.0.1:{QL_PORT}/api/envs?t=%s" % gettimestamp()
    s.headers.update({"Content-Type": "application/json;charset=UTF-8"})
    r = s.delete(url, json=data)
    if json.loads(r.text)["code"] == 200:
        return True
    else:
        return False


def get_token_list():
    url = "http://gixiu.com/t22-1-4"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36"
    }
    res = requests.get(url, headers=headers)
    localtime = time.localtime(time.time())
    datas = re.findall(f'{localtime.tm_mon}.{localtime.tm_mday}连签((?:.|\n)*)连签', res.text)
    if datas:
        shop_kl_list = re.findall('href="(.*?)"', datas[0])
        get_shop_token(shop_kl_list[0])
        token = [get_shop_token(kl) for kl in shop_kl_list if get_shop_token(kl)]
        return token


def get_shop_token(kl):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36"
    }
    try:
        res = requests.get(kl, headers=headers)
        url = re.findall("hrl='(.*?)';", res.text)[0]
        token_res = requests.get(url, headers=headers)
        token = re.findall("token=(.*?)&", token_res.url)[0]
        if token in old_token:
            return
        return token
    except Exception as e:
        print(e)


def shop_api(token):
    url = "https://api.m.jd.com/api?appid=interCenter_shopSign&t=" + gettimestamp() + "&loginType=2&functionId=interact_center_shopSign_getActivityInfo&body={%22token%22:%22" + token + "%22,%22venderId%22:%22%22}&jsonp=jsonp1000"
    headers = {
        "accept": "application/json",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "zh-CN,zh;q=0.9",
        "cookie": random.choice(ck_list),
        "referer": "https://h5.m.jd.com/",
        "user-agent": "Mozilla/5.0 (Linux; U; Android 10; zh-cn; MI 8 Build/QKQ1.190828.002) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/79.0.3945.147 Mobile Safari/537.36 XiaoMi/MiuiBrowser/13.5.40"
    }
    res = requests.get(url, headers=headers)
    res = re.findall("jsonp1000\((.*?)\);", res.text)[0]
    data = json.loads(res)
    print(data)
    try:
        if data["success"]:
            return True
        else:
            return False
    except Exception as e:
        print(e)
        return True


def filter(shop_list):
    shop_tk = []
    for shop in shop_list:
        if shop_api(shop):
            shop_tk.append(shop)
    return shop_tk


def get_token_and_id(items):
    return [item["value"] for item in items], [item["_id"] for item in items]


def main():
    token_list = get_token_list()
    for token in token_list:
        if shop_api(token):
            DPQDTK.append(token)
        if len(DPQDTK) >= 20:
            break
    print("成功获取到：", "\n".join(DPQDTK))
    if insert(DPQDTK):
        delete(_ids)


if __name__ == '__main__':
    s = requests.session()
    if token == "":
        login(username, password)
    else:
        s.headers.update({"authorization": "Bearer " + token})
    item = getitem("DPQDTK")
    ck_item = getitem("JD_COOKIE")
    ck_list, _ = get_token_and_id(ck_item)
    old_token, _ids = get_token_and_id(item)
    DPQDTK = filter(old_token)
    main()
