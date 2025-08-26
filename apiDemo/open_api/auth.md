## 请求方式 ##
- 请参照各API接口文档中的说明，在请求头Header参数中指定正确的Content-Type
- 请参照各API接口文档中的说明，在请求头Header参数中指定正确的Content-Type
- 请参照各API接口文档中的说明，在请求头Header参数中指定正确的Content-Type

<br/>

<a name="ggcs"></a>
## 公共参数 ##

调用API接口时请求头Header中必须传入的参数，目前支持的公共参数有：

| **参数名称** | **参数类型** | **是否必填** | **示例值**                       | **参数描述**                                                 |
| ------------ | ------------ | ------------ | -------------------------------- | ------------------------------------------------------------ |
| accessKey    | String       | 是           | fme2na3kdi3ki                    | 用户身份标识                                                 |
| ts           | String       | 是           | 1655710885431                    | 当前请求的时间戳（单位是毫秒），牛信服务端允许用户端请求最大时间误差为60000毫秒 |
| bizType      | String       | 是           | 1                                | [业务类型](#hGhKK)                                           |
| action       | String       | 是           | send                             | API接口方法，参数值参照各API接口文档中的说明                 |
| sign         | String       | 是           | 6e9506557d1f289501d333ee2c365826 | API入参参数签名，[签名算法](#yFiqL)                          |
| algorithm    | String       | 否           |md5 | 签名哈希算法，可用md5，sha256（默认md5）                          |

<br/>
<a name="hGhKK"></a>

**bizType参数说明：**

| **参数值** | **业务描述** |
| ---------- | ------------ |
| 1          | 号码检测     |
| 2          | whatsapp业务 |
| 3          | 短信         |
| 4          | DID业务      |
| 5          | 隐私号       |
| 6          | OTA         |
| 7          | Viber       |
| 8          |voice语音业务       |
| 9          |Zalo 通知服务业务       |

<a name="yFiqL"></a>

<br/>

## 签名算法 ##

为了防止API调用过程中被恶意篡改，调用API接口都需要携带请求签名。开放平台服务端会根据请求参数，对签名进行验证，签名不合法的请求将会被拒绝。

**签名算法**：
- 对于请求方式为`application/json`的接口，签名算法为：**`hex(md5(headersStr + bodyStr + accessSecretStr))`**
- 对于请求方式为`multipart/form-data`的接口，签名算法为：**`hex(md5(headersStr + accessSecretStr))`**

**签名说明**：
<br />
1. **headersStr** ：取全部必传的header参数（除了`sign`以外），字段排序按ASCII码升序，按`key=val`格式，字段之间以`&`拼接。得到拼接后字符串`accessKey=YOUR_ACCESS_KEY&action=ACTION&bizType=BIZ_TYPE&ts=CURRENT_TIMESTAMP`
2. **bodyStr**：在上一步骤得到的字符串后拼接上 `&body=body中的json字符串`。注意事项：
   1. 对于请求方式为multipart/form-data的接口，无需拼接bodyStr，跳过该步骤
   2. 如果body中的json字符串为null或者为空字符串，无需拼接bodyStr，跳过该步骤
   3. 计算签名时取的body中的json字符串一定要和实际发起请求时的body中的json串一样
   4. 计算签名时取的body中的json字符串一定要和实际发起请求时的body中的json串一样
   5. 计算签名时取的body中的json字符串一定要和实际发起请求时的body中的json串一样
3. **accessSecretStr**：账号对应密钥，最后以`&accessSecret=YOUR_ACCESS_SECRET`结尾
4. 使用**algorithm**指定的哈希算法（默认情况下md5）生成签名，得到的字节流结果转换成**十六进制小写**

<br/>

### 计算签名代码示例 ###

#### Java ####
```java
/**
 * 生成接口参数签名demo
 */
@Test
public void generateSignDemo() {
    // header参数
    Map<String, String> headers = new HashMap<>(8);
    headers.put("accessKey", "fme2na3kdi3ki");
    headers.put("ts", "1655710885431");
    headers.put("bizType", "1");
    headers.put("action", "send");

    // 业务参数
    JSONObject postData = new JSONObject();
    postData.put("id", 10001);
    postData.put("name", "牛小信");
    String body = postData.toString();
    
    // accessKey对应的密码
    String accessSecret = "abciiiko2k3";

    String sign = calcSign(headers, body, accessSecret);
    log.info("sign: {}", sign); // sign: 87c3560d3331ae23f1021e2025722354
}

/**
 * 计算sign签名
 *
 * @param headers      请求头中的公共参数
 * @param body         body中的json字符串
 * @param accessSecret 秘钥
 * @return
 */
private String calcSign(Map<String, String> headers, String body, String accessSecret) {
    StringBuilder raw = new StringBuilder();

    // step1: 拼接header参数
    raw.append("accessKey=").append(headers.get("accessKey")).append("&action=").append(headers.get("action"))
            .append("&bizType=").append(headers.get("bizType")).append("&ts=").append(headers.get("ts"));
    log.info("step1: {}", raw); // step1: accessKey=fme2na3kdi3ki&action=send&bizType=1&ts=1655710885431

    // step2: 拼接body参数
    if (StringUtils.isNotEmpty(body)) {
        raw.append("&body=").append(body);
    }
    log.info("step2: {}", raw); // step2: accessKey=fme2na3kdi3ki&action=send&bizType=1&ts=1655710885431&body={"name":"牛小信","id":10001}

    // step3: 拼接accessSecret
    raw.append("&accessSecret=").append(accessSecret);
    log.info("step3: {}", raw); // step3: accessKey=fme2na3kdi3ki&action=send&bizType=1&ts=1655710885431&body={"name":"牛小信","id":10001}&accessSecret=abciiiko2k3

    // step4: MD5算法加密,结果转换成十六进制小写
    String sign = DigestUtils.md5Hex(raw.toString());
    log.info("step4: sign={}", sign); // step4: sign=87c3560d3331ae23f1021e2025722354

    return sign;
}
```

<br/>

#### C# ####

```csharp
public static void Main() {

    // Header参数
    Dictionary<string, string> headers = new Dictionary<string, string>();
    headers.Add("accessKey", "fme2na3kdi3ki");
    headers.Add("ts", "1655710885431");
    headers.Add("bizType", "1");
    headers.Add("action", "send");

    // 业务参数
    string body = "{\"name\":\"牛小信\",\"id\":10001}";

    // accessKey对应的秘钥
    string accessSecret = "abciiiko2k3";
    
    string sign = calcSign(headers, body, accessSecret);
    Console.WriteLine("sign: {0}", sign); // sign: 87c3560d3331ae23f1021e2025722354
}


/**
 * 计算sign签名
 *
 * @param headers      请求头中的公共参数
 * @param body         body中的json字符串
 * @param accessSecret 秘钥
 * @return
 */
public static string calcSign(IDictionary<string, string> headers, String body, string accessSecret) {
    StringBuilder str = new StringBuilder();
    
    // step1: 拼接header参数
    str.Append("accessKey=").Append(headers["accessKey"]).Append("&action=").Append(headers["action"])
        .Append("&bizType=").Append(headers["bizType"]).Append("&ts=").Append(headers["ts"]);
    Console.WriteLine("step1: {0}", str); // step1: accessKey=fme2na3kdi3ki&action=send&bizType=1&ts=1655710885431
    
    // step2: 拼接body参数
    if (!string.IsNullOrEmpty(body)) {
        str.Append("&body=").Append(body);
    }
    Console.WriteLine("step2: {0}", str); // step2: accessKey=fme2na3kdi3ki&action=send&bizType=1&ts=1655710885431&body={"name":"牛小信","id":10001}
    
    // step3: 拼接accessSecret
    str.Append("&").Append("accessSecret=").Append(accessSecret);
    Console.WriteLine("step3: {0}", str); // step3: accessKey=fme2na3kdi3ki&action=send&bizType=1&ts=1655710885431&body={"name":"牛小信","id":10001}&accessSecret=abciiiko2k3
    
    // step4: MD5算法加密,结果转换成十六进制小写
    MD5 md5 = MD5.Create();
    byte[] bytes = md5.ComputeHash(Encoding.UTF8.GetBytes(str.ToString()));
    StringBuilder result = new StringBuilder();
    for (int i = 0; i < bytes.Length; i++)
    {
        result.Append(bytes[i].ToString("x2"));
    }
    string sign = result.ToString();
    Console.WriteLine("step4: sign={0}", sign); // step4: sign=87c3560d3331ae23f1021e2025722354


    return sign;
}
```

<br/>

#### PHP ####

```php
<?php

$headers = array("accessKey" => "fme2na3kdi3ki", "ts" => "1655710885431", "bizType" => "1", "action" => "send");
$postData = array("id" => 10001, "name" => "牛小信");
$body = json_encode($postData, JSON_UNESCAPED_UNICODE);
echo "body= " . $body . "\n"; // body= {"id":10001,"name":"牛小信"}

$accessSecret = "abciiiko2k3";
$sign = calcSign($headers, $body, $accessSecret);
echo "sign=" . $sign; // sign=7750759da06333f20d0640be09355e34


/**
  * 计算sign签名
  *
  * @param headers      请求头中的公共参数
  * @param body         body中json字符串
  * @param accessSecret 秘钥
  * @return
  */
function calcSign($headers, $body, $accessSecret) {
    // step1: 拼接header参数
    $str = "accessKey=".$headers['accessKey']."&action=".$headers['action']
        ."&bizType=".$headers['bizType']."&ts=".$headers['ts'];
    echo "step1: " . $str . "\n"; // step1: accessKey=fme2na3kdi3ki&action=send&bizType=1&ts=1655710885431
    
    // step2: 拼接body参数
    if (!empty($body)) {
        $str = $str . "&body=" . $body;
    }
    echo "step2: " . $str . "\n"; // step2: accessKey=fme2na3kdi3ki&action=send&bizType=1&ts=1655710885431&body={"id":10001,"name":"牛小信"}
    
    // step3: 拼接accessSecret
    $str = $str . "&accessSecret=" . $accessSecret;
    echo "step3: " . $str . "\n"; // step3: accessKey=fme2na3kdi3ki&action=send&bizType=1&ts=1655710885431&body={"id":10001,"name":"牛小信"}&accessSecret=abciiiko2k3
    
    // step4: MD5算法加密,结果转换成十六进制小写
    $ret = md5($str);
    echo "step4: sign=" . $ret . "\n"; // step4: sign=7750759da06333f20d0640be09355e34

    return $ret;
}

?>
```

<br/>

#### Python ####

```python
'''
计算sign签名
headers      请求头中的公共参数
body         body中json字符串
accessSecret 秘钥
'''
def calc_sign(headers, body, accessSecret):
    # step1: 拼接header参数
    string_raw = 'accessKey=' + str(headers['accessKey']) + '&action=' + str(headers['action']) + '&bizType=' + str(headers['bizType'])  + '&ts=' + str(headers['ts']) 
    print("step1:",string_raw); # step1: accessKey=fme2na3kdi3ki&action=send&bizType=1&ts=1655710885431
    
    # step2: 拼接body参数
    if len(body) > 0:
        string_raw += '&body=' + body
    print("step2:",string_raw); # step2: accessKey=fme2na3kdi3ki&action=send&bizType=1&ts=1655710885431&body={"id": 10001, "name": "牛小信"}
    
    # step3: 拼接accessSecret
    string_raw += '&accessSecret=' + accessSecret
    print("step3:",string_raw); # step3: accessKey=fme2na3kdi3ki&action=send&bizType=1&ts=1655710885431&body={"id": 10001, "name": "牛小信"}&accessSecret=abciiiko2k3

    # step4: MD5算法加密,结果转换成十六进制小写
    sign = hashlib.md5(string_raw.encode()).hexdigest()
    print("step4: sign=",sign); # step4: sign= d0c24a9886c629330d7f3f2056c65bc2
    return sign


headers = {'accessKey':'fme2na3kdi3ki','ts':'1655710885431','bizType':'1','action':'send'}

params = {'id':10001,'name':'牛小信'}
body = json.dumps(params, ensure_ascii=False, separators=(",", ":"))
print("body=", body) # body= {"id": 10001, "name": "牛小信"}

accessSecret = 'abciiiko2k3'

sign = calc_sign(headers, body, accessSecret)
print("sign=", sign) # sign= d0c24a9886c629330d7f3f2056c65bc2
```

<br/>

#### Go ####

```go
func main() {
    
    headers := map[string]string{
        "accessKey": "fme2na3kdi3ki",
    	"ts": "1655710885431",
   		"bizType": "1",
    	"action": "send",
	}
	
	postData := map[string]interface{}{
        "id": 10001,
    	"name": "牛小信",
	}
    bodyByte, err := json.Marshal(postData)
    if err != nil {
      fmt.Printf("序列号错误 err=%v\n", err)
    }
    body := string(bodyByte)
	fmt.Println("body:", body) // body: {"id":10001,"name":"牛小信"}

    accessSecret := "abciiiko2k3"

    sign := calcSign(headers, body, accessSecret)
    fmt.Println("sign:", sign) // sign: 7750759da06333f20d0640be09355e34
}


/**
 * 计算sign签名
 *
 * @param headers      请求头中的公共参数
 * @param body         body中json字符串
 * @param accessSecret 秘钥
 * @return
 */
func calcSign(headers map[string]string, body string, accessSecret string) string {
    var build strings.Builder
    
    // step1: 拼接header参数
    build.WriteString("accessKey=");
    build.WriteString(headers["accessKey"]);
    build.WriteString("&action=");
    build.WriteString(headers["action"]);
    build.WriteString("&bizType=");
    build.WriteString(headers["bizType"]);
    build.WriteString("&ts=");
    build.WriteString(headers["ts"]);
    fmt.Println("step1:", build.String()) // step1: accessKey=fme2na3kdi3ki&action=send&bizType=1&ts=1655710885431
    
    // step2: 拼接body参数
    if len(body) > 0 {
        build.WriteString("&body=");
        build.WriteString(body);
    }
    fmt.Println("step2:", build.String()) // step2: accessKey=fme2na3kdi3ki&action=send&bizType=1&ts=1655710885431&body={"id":10001,"name":"牛小信"}
    
    // step3: 拼接accessSecret
    build.WriteString("&accessSecret=")
    build.WriteString(accessSecret)
    raw := build.String();
    fmt.Println("step3:", raw) // step3: accessKey=fme2na3kdi3ki&action=send&bizType=1&ts=1655710885431&body={"id":10001,"name":"牛小信"}&accessSecret=abciiiko2k3    
    // step4: MD5算法加密,结果转换成十六进制小写
    md5Result := md5.Sum([]byte(raw))
    sign := fmt.Sprintf("%x", md5Result)
    fmt.Println("step4: sign=", sign) // step4: sign= 7750759da06333f20d0640be09355e34

    return sign
}
```

<br/>

## 调用示例 ##
以请求方式为`application/json`的接口为例，签名调用过程如下：
> **1. 设置参数值**
- Header中的公共参数：
   - `accessKey: fme2na3kdi3ki`
   - `bizType: 1`
   - `action: send`
   - `ts: 1655710885431`
- body参数：
   - `{"name":"牛小信","id":10001}`

<br/>

> **2. 拼接Header、body、accessSecret**

`accessKey=fme2na3kdi3ki&action=send&bizType=1&ts=1655710885431&body={"name":"牛小信","id":10001}&accessSecret=abciiiko2k3`

<br/>

> **3. 生成签名**

根据签名算法：`hex(md5(headersStr + bodyStr + accessSecretStr))` <br />进行MD5加密，得到的结果转为十六进制小写。sign:`87c3560d3331ae23f1021e2025722354`

<br/>

> **4. 组装HTTP请求**

将签名加入到Header中，发起HTTP请求，最终请求Header、body如下：

- Header中的公共参数：
   - `accessKey: fme2na3kdi3ki`
   - `bizType: 1`
   - `action: send`
   - `ts: 1655710885431`
   - `sign: 87c3560d3331ae23f1021e2025722354`
- body参数：

   - `{"name":"牛小信","id":10001}`

<br/>

<a name="cjcwm"></a>
## 常见错误码 ##

| **错误码** | **错误信息** | **错误原因/解决方案**                                        |
| ---------- | ------------ | ------------------------------------------------------------ |
| 1001       | Missing common parameters | Header中必须携带所有必填的[公共参数](#ggcs)                  |
| 1002       | Parameter error     | 检查Header中`bizType` 、`action` 参数是否正确；<br/>检查Body中的参数是否正确 |
| 1003       | Invalid signature     | 检查sign值签名计算是否有问题。常见的几种错误原因：<br>1、请求方式错误，需要在请求头Header参数中设置正确的Content-Type（Content-Type参照各API接口文档说明）；<br>2、计算签名时取的body中的json字符串和实际发起请求时的body中的json串不一样（例如：实际请求时body中json串如果带有换行符，在计算签名拼接的body字符串也必须是带有换行符的）；<br>3、accessSecret错误；<br>4、签名计算错误，请参照[签名算法](#yFiqL)进行检查 |
| 1004       | Timestamp has expired | Header中ts参数有误，这里传的时间戳单位为毫秒，牛信服务端允许用户端请求最大时间误差为60000毫秒 |
| 1005       | Insufficient permissions     | accessKey错误或当前账号没有相应业务的权限                    |