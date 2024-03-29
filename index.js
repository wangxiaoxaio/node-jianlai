import Superagent from "superagent";
import Cheerio from "cheerio";
import nodeMailer from "nodemailer";
import readline from "readline";

let user_data = {}; //用户输入的数据
let map = { "1": "http://book.zongheng.com", "2": "https://book.qidian.com" }; //映射表

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

//命令行交互
rl.question("小说名   ：", answer => {
  user_data["title"] = answer;
  rl.question("小说更新网站(1.某纵横 2.某起点)   :", answer => {
    user_data["website"] = parseInt(answer);
    rl.question("你希望接收更新邮件的邮箱:", answer => {
      user_data["Remail"] = answer;
      rl.question(
        "你发送更新邮件的邮箱地址(发送邮件的邮箱和接收邮件的邮箱可以为同一个邮箱):",
        answer => {
          user_data["Semail"] = answer;
          console.log("please waiting:");
          main();
          rl.close();
        }
      );
    });
  });
});

//主函数

function main() {
  if (user_data["website"] === 1) {
    // 用户选择纵横，隔一段时间发一次请求
    setInterval(() => {
      zongheng()
    }, 40000);
  }
  if (user_data["website"] === 2) {
    // 同上
    setInterval(() => {
      qidian()
    }, 40000);
  }
}
// return main

// 爬取页面并返回解析后的页面数据
async function agentAndCheerio(url) {
  try {
    let res = await Superagent.get(url);
    let $ = Cheerio.load(res.text);
    return $;
  } catch (e) {
    return console.log("agentAndCheerio error" + e);
  }
}

// 发送邮件
async function sendMail(result) {
  let transporter = nodeMailer.createTransport({
    host: "smtp.qq.com",
    port: 587,
    secure: false,
    auth: {
      user: user_data["Semail"],
      pass: "opovxqymabjriebj" //使用你自己生成的授权码
    }
  });
  let mailOptions = {
    from: user_data["Semail"],
    to: user_data["Remail"],
    subject: `${result.name}更新通知`,
    html: `<p>您追的小说<span style="color:red">
                ${result.name}</span>已经于<span style="color:yellow">
                    ${
                      result.time
                    }</span>更新，更新章节名为<span style="color:blue">${
      result.title
    }</span>`
  };
  try {
    let res = await transporter.sendMail(mailOptions);
    console.log(`Message send:${res.messageId}`)
    return true
  } catch(e){
      console.error(`sendMail error:${e}`)
      return false
  }
}

// 起点和纵横获取相关信息的方法稍有不同，抽象成两个函数
async function qidian() {
  let baseUrl = map["2"];
  let keyword = encodeURIComponent(user_data["title"]);
  let searchUrl = `https://www.qidian.com/search?kw=${keyword}`;
  try {
    let $ = await agentAndCheerio(searchUrl);
    let uid = $(".res-book-item[data-rid=1]").attr("data-bid"); //提取小说对应的id信息
    let url = `${baseUrl}/info/${uid}`;
    $ = await agentAndCheerio(url);
    let result = {};
    let time = $(".time").text();
    let title = $("li.update p.cf .blue").text();
    result["time"] = time;
    result["title"] = title;
    result["name"] = user_data["title"];
    if (result["time"] === "1分钟前") {
      await sendMail(result);
      // console.log(result);
    }
  } catch (e) {
    console.error(`qidian error:${e}`);
  }
}

async function zongheng() {
  let baseUrl = map["1"];
  let kw = encodeURIComponent(user_data["title"]);
  let searchUrl = `http://search.zongheng.com/s?keyword=${kw}`;
  try {
    let $ = await agentAndCheerio(searchUrl);
    let uid = JSON.parse($(".btn .bkinfo").first().attr('data-sa-d'))['book_id']
    let url = `${baseUrl}/book/${uid}.html`;
    $ = await agentAndCheerio(url);
    let result = {};
    let title = $(".book-new-chapter .tit a").text();
    let time = $(".time")
      .text()
      .replace(/\s+/g, "")
      .match(/^\xb7([\w\u4E00-\u9FA5\uF900-\uFA2D]+)\xb7/)[1];
    result["time"] = time;
    result["title"] = title;
    result["name"] = user_data["title"];
    // console.log(result);
    if (result["time"] === "1分钟前") {
      await sendMail(result);
      // console.log(result);
    }
  } catch (e) {
    console.error(`zongheng error:${e}`);
  }
}
