const { Server, Socket } = require("socket.io");
const express = require("express");

const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
var rcon = require("/root/Voting/Banning System/backend/node_modules/srcds/rcon.js");


const port = 80;

let team_on_turn;
let socketA = [];
let socketB = [];
let map_num = 3;  //TODO Počet map na konci
let socketAdmin = [];
let map_list_val = ["ascent", "bind", "breeze", "fracture", "haven", "icebox", "split"];
let map_list = ["mirage", "overpass", "dust2", "vertigo", "ancient", "inferno", "nuke"];
let maps_remaining = [];
maps_remaining = map_list_val;
let Ax = 0;
let Bx = 0;

let codeA = "0TeamA";
let codeB = "0TeamB";
let codeAdmin = "0Admin";

let teamNameA = "TeamA";
let teamNameB = "TeamB";

let ban_started = false;

io.on("connection", (socket) => {
  socket.on("login", (data) => {
    let code = data.code;
    console.log(`Code in DB: A=${codeA}; B=${codeB}`);
    if (code == codeA) {
      //Team A
      socketA.push(socket);
      socket.emit("login_response", { result: "A", team: teamNameA });
    } else {
      if (code == codeB) {
        //Team B
        socketB.push(socket);
        socket.emit("login_response", { result: "B", team: teamNameB });
      } else {
        if (code == codeAdmin) {
          //Team Admin
          socketAdmin.push(socket);
          socket.emit("login_response", { result: "Admin" });
          team_on_turn = Math.floor(Math.random() * 10) + 1 <= 5 ? "A" : "B";
          socket.on("start_ban", (data) => {
            if (data.code == codeAdmin) {
              ban_started = true;
              io.emit("ban_start", { starting_team: team_on_turn });
            }
          });
        } else {
          //WRONG CODE
          socket.emit("login_response", { result: "Invalid Code" });
        }
      }
    }

    socket.on("request_map_banned", (data) => {
      if (data.code == codeA) {
        //Team A request ban
        if (team_on_turn == "A") {
          ban(data.map, teamNameA);
        } else {
          return;
        }
      } else if (data.code == codeB) {
        //Team B request ban
        if (team_on_turn == "B") {
          ban(data.map, teamNameB);
        } else {
          return;
        }
      } else if (data.code == codeAdmin) {
        //Admin hard banned sth.
        ban(data.map, "Admin");
      } else {
        return;
      }
      
      team_on_turn = team_on_turn == "A" ? "B" : "A";
      io.emit("banned_map", { id: data.map });

      if (maps_remaining.length == 1) {
        io.emit("ban_end", { maps: maps_remaining });
      } else {
        io.emit("ban_start", { starting_team: team_on_turn });
      }
    });

    let ban = (map, team) => {
      const index = maps_remaining.findIndex((value, index, obj) => {
        return value == map.split("_")[0];
      });

      if (index > -1) {
        maps_remaining.splice(index, 1);
        console.log(maps_remaining);
      }

      console.log(`Tým ${team} zabanoval mapu ${map}`);
    };

    // Adminův toolbox
    socket.on("admin_set_team", (data) => {
      if (data.code == codeAdmin) {
        switch (data.team) {
          case "A":
            codeA = data.teamCode;
            teamNameA = data.teamName;
            break;

          case "B":
            codeB = data.teamCode;
            teamNameB = data.teamName;
            break;
        }
      }
    });

  });
});

app.use(express.static("../frontend/src"));
app.get("/", (req, res) => res.sendFile("index.html"));
http.listen(port, () => console.log(`Example app listening on port ${port}!`));
