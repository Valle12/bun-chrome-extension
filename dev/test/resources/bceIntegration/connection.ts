export class Connection {
  connect() {
    new WebSocket("ws://localhost:8080");
  }
}
