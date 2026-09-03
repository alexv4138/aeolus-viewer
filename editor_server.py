import base64
import json
import subprocess
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent


class EditorHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/rebuild":
            self.send_error(404)
            return
        try:
            size = int(self.headers["Content-Length"])
            payload = json.loads(self.rfile.read(size))
            frames = payload["frames"]
            fps = int(payload.get("fps", 24))
            stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            output_dir = ROOT / "editor-output" / stamp
            output_dir.mkdir(parents=True, exist_ok=True)
            for number, data_url in enumerate(frames, start=1):
                _, encoded = data_url.split(",", 1)
                (output_dir / f"frame-{number:04d}.png").write_bytes(base64.b64decode(encoded))
            output = output_dir / "aeolus-edited.mp4"
            subprocess.run(
                ["ffmpeg", "-y", "-framerate", str(fps), "-i", str(output_dir / "frame-%04d.png"),
                 "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output)],
                check=True, capture_output=True,
            )
            body = json.dumps({"url": f"/editor-output/{stamp}/aeolus-edited.mp4"}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as error:
            body = json.dumps({"error": str(error)}).encode()
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)


if __name__ == "__main__":
    import os
    os.chdir(ROOT)
    ThreadingHTTPServer(("127.0.0.1", 8765), EditorHandler).serve_forever()
