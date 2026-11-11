export interface RegexPreset {
  id: string;
  name: string;
  category: '.NET 分组示例' | '常用校验';
  pattern: string;
  flags: string;
  sampleText: string;
  replaceTemplate: string;
  description: string;
}

export interface CheatSheetItem {
  token: string;
  title: string;
  description: string;
  example?: string;
  isDotNet?: boolean;
}

export interface CheatSheetCategory {
  id: string;
  name: string;
  badge?: string;
  items: CheatSheetItem[];
}

export const REGEX_PRESETS: RegexPreset[] = [
  {
    id: 'dotnet-log-parser',
    name: '.NET 命名分组日志解析',
    category: '.NET 分组示例',
    pattern: `\\[(?<date>\\d{4}-\\d{2}-\\d{2})\\s+(?'time'\\d{2}:\\d{2}:\\d{2})\\]\\s+\\[(?<level>INFO|WARN|ERROR)\\]\\s+Module:(?'module'[A-Za-z0-9_]+)\\s+-\\s+(?<message>.+)`,
    flags: 'gm',
    sampleText: `[2026-11-10 21:45:02] [INFO] Module:AuthGateway - User wangxiangming authenticated via OAuth2 token (SessionId=9f8a7b6c5d4e3f2a1b0c)
[2026-11-10 21:45:19] [WARN] Module:OrderProcessor - High latency detected on node us-east1-b (elapsed=1420ms, retryCount=2, payloadHash=sha256:8f9d2a7c4b1e5f6a3d2c1b0e9f8a7d6c)
[2026-11-10 21:46:05] [ERROR] Module:PaymentClient - Connection timeout while calling https://api.stripe.internal/v1/charges (traceId=tr_77889900aabbccddeeff)`,
    replaceTemplate: '[${level}] ${date} ${time} (${module}) => ${message}',
    description: "同时演示 .NET 尖括号 (?<name>...) 与单引号 (?'name'...) 命名捕获组及长文本日志解析",
  },
  {
    id: 'dotnet-idcard',
    name: '18位身份证号 (.NET 命名提取)',
    category: '.NET 分组示例',
    pattern: `(?<province>\\d{2})(?<city>\\d{4})(?'birthYear'\\d{4})(?'birthMonth'\\d{2})(?'birthDay'\\d{2})(?<seq>\\d{3})(?<checkCode>[0-9Xx])`,
    flags: 'gm',
    sampleText: `申请人A：张三，身份证号 11010519920816451X，户籍地址：北京市朝阳区建国路88号院。
申请人B：李四，身份证号 310115199812052328，户籍地址：上海市浦东新区世纪大道100号。
无效号码测试：123456789012345`,
    replaceTemplate: '出生日期：${birthYear}年${birthMonth}月${birthDay}日 (省市代码:${province}${city}, 校验码:${checkCode})',
    description: '使用 .NET 命名分组提取身份证中的省市代码、出生年月日、顺序码与校验码',
  },
  {
    id: 'dotnet-backref',
    name: '.NET 命名反向引用查重',
    category: '.NET 分组示例',
    pattern: `<(?'tag'[a-zA-Z][a-zA-Z0-9]*)\\b[^>]*>(?<content>[\\s\\S]*?)</\\k'tag'>`,
    flags: 'gm',
    sampleText: `<div class="card">标题内容</div>
<span id="badge">状态正常</span>
<p>这是一段包含长文本的段落，用于测试开闭标签匹配是否正确。</p>
<div>标签不匹配示例</span>`,
    replaceTemplate: '[标签:${tag}] 内容: ${content}',
    description: "演示 .NET 单引号命名分组 (?'tag'...) 与命名反向引用 \\k'tag' 匹配成对 HTML 标签",
  },
  {
    id: 'common-email',
    name: '电子邮箱 (Email)',
    category: '常用校验',
    pattern: `(?<username>[a-zA-Z0-9._%+-]+)@(?<domain>[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})`,
    flags: 'gm',
    sampleText: `联系邮箱：support@jyshare.com, dev.team+regex@github.io
企业邮箱：zhangsan_2026@company.com.cn
错误格式：invalid-email@, @missing-user.com`,
    replaceTemplate: '用户[${username}] 域名[${domain}]',
    description: '提取电子邮箱的用户名与域名部分',
  },
  {
    id: 'common-phone',
    name: '中国大陆手机号',
    category: '常用校验',
    pattern: `(?:\\+?86[-\\s]?)?(?<carrier>1[3-9]\\d)[-\\s]?(?<middle>\\d{4})[-\\s]?(?<tail>\\d{4})`,
    flags: 'gm',
    sampleText: `客户电话列表：
13812345678
+86 186-8899-0011
199 2026 8888
座机：010-88886666`,
    replaceTemplate: '${carrier}****${tail}',
    description: '匹配中国大陆11位手机号，并在替换测试中演示中间4位脱敏（$1****$3 或 ${carrier}****${tail}）',
  },
  {
    id: 'common-url',
    name: '网址 URL 解析',
    category: '常用校验',
    pattern: `(?<protocol>https?|ftp)://(?<host>[a-zA-Z0-9.-]+)(?::(?<port>\\d+))?(?<path>/[^\\s?#]*)?(?:\\?(?<query>[^\\s#]*))?`,
    flags: 'gm',
    sampleText: `接口地址：https://www.jyshare.com/front-end/854/?lang=zh-CN&mode=dotnet
本地调试：http://localhost:3000/api/v1/regex/test?debug=true
静态部署：https://username.github.io/regex-studio/index.html`,
    replaceTemplate: 'Host: ${host} | Path: ${path} | Query: ${query}',
    description: '将 URL 拆解为 protocol、host、port、path 和 query 命名分组',
  },
  {
    id: 'common-ipv4',
    name: 'IPv4 地址与端口',
    category: '常用校验',
    pattern: `\\b(?<ip>(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?))(?:\\:(?'port'\\d{1,5}))?\\b`,
    flags: 'gm',
    sampleText: `负载均衡节点：192.168.1.105:8080, 10.0.0.1:443, 172.16.254.1
广播地址：255.255.255.255
越界无效IP：256.100.0.1, 999.999.999.999`,
    replaceTemplate: 'IP=${ip} (Port=${port})',
    description: '精确匹配合法的 0-255 四段式 IPv4 地址及可选端口号',
  },
];

export const CHEAT_SHEET_CATEGORIES: CheatSheetCategory[] = [
  {
    id: 'dotnet-groups',
    name: '.NET 分组与替换语法',
    badge: '.NET 特色',
    items: [
      {
        token: '(?<name>exp)',
        title: '.NET / 标准命名捕获组',
        description: '匹配 exp 并将其捕获到名称为 name 的分组中（推荐语法）。',
        example: '(?<year>\\d{4})',
        isDotNet: true,
      },
      {
        token: "(?'name'exp)",
        title: '.NET 单引号命名捕获组',
        description: '.NET 特有的单引号命名分组语法，作用与 (?<name>exp) 完全一致。',
        example: "(?'month'\\d{2})",
        isDotNet: true,
      },
      {
        token: '\\k<name>',
        title: '命名反向引用 (尖括号)',
        description: '反向引用前面已捕获的名为 name 的分组文本。',
        example: '(?<w>\\w+)\\s+\\k<w>',
        isDotNet: true,
      },
      {
        token: "\\k'name'",
        title: '.NET 命名反向引用 (单引号)',
        description: '.NET 特有的单引号反向引用语法，匹配已捕获的 name 分组内容。',
        example: "<(?'tag'\\w+)>.*?</\\k'tag'>",
        isDotNet: true,
      },
      {
        token: '(?:exp)',
        title: '非捕获分组',
        description: '匹配 exp，但不分配分组编号，也不捕获文本供后续引用。',
        example: '(?:https?|ftp)://',
      },
      {
        token: '(?#comment)',
        title: '.NET 内联注释',
        description: '.NET 注释分组，括号内的说明文字不会参与正则匹配。',
        example: '\\d{4}(?#匹配四位年份)',
        isDotNet: true,
      },
      {
        token: '(?i) / (?m) / (?s)',
        title: '.NET 内联模式修饰符',
        description: '在表达式开头声明忽略大小写(i)、多行模式(m)或单行点号通配(s)。',
        example: '(?i)hello',
        isDotNet: true,
      },
      {
        token: '${name} / $1',
        title: '.NET 命名与序号替换引用',
        description: '在替换模板中引用名为 name 的命名分组（${name}）或第 N 个分组（$1）。',
        example: '${year}年$2月',
        isDotNet: true,
      },
    ],
  },
  {
    id: 'metacharacters',
    name: '常用元字符',
    items: [
      {
        token: '.',
        title: '任意字符',
        description: '匹配除换行符（\\n）以外的任意单个字符（开启 s 修饰符后包含换行符）。',
      },
      {
        token: '\\w',
        title: '单词字符',
        description: '匹配字母、数字或下划线，等价于 [A-Za-z0-9_]。',
      },
      {
        token: '\\W',
        title: '非单词字符',
        description: '匹配任意不是字母、数字、下划线的字符。',
      },
      {
        token: '\\d',
        title: '数字字符',
        description: '匹配任意一个阿拉伯数字，等价于 [0-9]。',
      },
      {
        token: '\\D',
        title: '非数字字符',
        description: '匹配任意一个非数字字符，等价于 [^0-9]。',
      },
      {
        token: '\\s',
        title: '空白字符',
        description: '匹配空格、制表符(\\t)、换行符(\\n)、回车符(\\r)等空白。',
      },
      {
        token: '\\S',
        title: '非空白字符',
        description: '匹配除空白符以外的任意字符。',
      },
      {
        token: '^',
        title: '行首 / 字符串开头',
        description: '匹配输入字符串的开始位置；在多行模式 (m) 下匹配每一行的开头。',
      },
      {
        token: '$',
        title: '行尾 / 字符串结尾',
        description: '匹配输入字符串的结束位置；在多行模式 (m) 下匹配每一行的结尾。',
      },
      {
        token: '\\b',
        title: '单词边界',
        description: '匹配单词的开头或结尾边界位置（零宽度）。',
      },
    ],
  },
  {
    id: 'quantifiers',
    name: '量词与重复控制',
    items: [
      {
        token: '*',
        title: '零次或多次 (贪婪)',
        description: '匹配前面的子表达式 0 次或多次，等价于 {0,}。',
      },
      {
        token: '+',
        title: '一次或多次 (贪婪)',
        description: '匹配前面的子表达式 1 次或多次，等价于 {1,}。',
      },
      {
        token: '?',
        title: '零次或一次',
        description: '匹配前面的子表达式 0 次或 1 次，等价于 {0,1}。',
      },
      {
        token: '{n}',
        title: '恰好 n 次',
        description: '精确匹配前面的子表达式 n 次（例如 \\d{4} 匹配4位数字）。',
      },
      {
        token: '{n,}',
        title: '至少 n 次',
        description: '匹配前面的子表达式至少 n 次，上不封顶。',
      },
      {
        token: '{n,m}',
        title: 'n 到 m 次',
        description: '最少匹配 n 次且最多匹配 m 次。',
      },
      {
        token: '*? / +?',
        title: '非贪婪（懒惰）模式',
        description: '在量词后加上 ?，使其匹配尽可能少的字符。',
        example: '<.*?>',
      },
    ],
  },
  {
    id: 'lookaround',
    name: '零宽断言 (Lookaround)',
    items: [
      {
        token: '(?=exp)',
        title: '正向先行断言 (Positive Lookahead)',
        description: '断言当前位置右侧能够匹配 exp，但 exp 本身不计入匹配结果。',
        example: '\\d+(?=元)',
      },
      {
        token: '(?!exp)',
        title: '负向先行断言 (Negative Lookahead)',
        description: '断言当前位置右侧不能匹配 exp。',
        example: '\\d{3}(?!\\d)',
      },
      {
        token: '(?<=exp)',
        title: '正向后行断言 (Positive Lookbehind)',
        description: '断言当前位置左侧能够匹配 exp，且 exp 不计入匹配结果。',
        example: '(?<=¥)\\d+\\.\\d{2}',
      },
      {
        token: '(?<!exp)',
        title: '负向后行断言 (Negative Lookbehind)',
        description: '断言当前位置左侧不能匹配 exp。',
        example: '(?<!-)\\d+',
      },
    ],
  },
  {
    id: 'charclasses',
    name: '字符集与修饰符',
    items: [
      {
        token: '[xyz]',
        title: '字符集合',
        description: '匹配方括号中所包含的任意一个字符。',
      },
      {
        token: '[^xyz]',
        title: '负值字符集合',
        description: '匹配未包含在方括号中的任意字符。',
      },
      {
        token: '[a-z] / [0-9]',
        title: '字符范围',
        description: '匹配指定范围内的任意字符。',
      },
      {
        token: '[\\u4e00-\\u9fa5]',
        title: '中文字符',
        description: '匹配任意单个简体/繁体中文汉字。',
      },
      {
        token: 'g (Global)',
        title: '全局匹配修饰符',
        description: '查找全文中所有匹配项，而不是在找到第一个匹配后停止。',
      },
      {
        token: 'i (IgnoreCase)',
        title: '忽略大小写修饰符',
        description: '匹配时不区分英文字母大小写（对应 .NET RegexOptions.IgnoreCase）。',
      },
      {
        token: 'm (Multiline)',
        title: '多行模式修饰符',
        description: '使 ^ 和 $ 匹配每一行的行首和行尾（对应 .NET RegexOptions.Multiline）。',
      },
      {
        token: 's (Singleline)',
        title: '单行点号通配修饰符',
        description: '使元字符 . 能够匹配包括换行符 \\n 在内的所有字符（对应 .NET RegexOptions.Singleline）。',
      },
    ],
  },
];
