local ffi = require("ffi")
ffi.cdef[[
int open(const char *pathname, int flags);
int ioctl(int fd, unsigned long request, void *arg);
long read(int fd, void *buf, unsigned long count);
int close(int fd);
struct pollfd { int fd; short events; short revents; };
int poll(struct pollfd *fds, unsigned long nfds, int timeout);
]]

local dev = arg[1]
local root = arg[2] or "/mnt/us/kindle-dashboard"
if not dev then os.exit(2) end
local fd = ffi.C.open(dev, 0)
if fd < 0 then os.exit(3) end
local EVIOCGRAB = 0x40044590
if ffi.C.ioctl(fd, EVIOCGRAB, ffi.new("int[1]", 1)) ~= 0 then ffi.C.close(fd); os.exit(4) end
local buf = ffi.new("uint8_t[16]")
local pollfd = ffi.new("struct pollfd[1]")
pollfd[0].fd = fd
pollfd[0].events = 1
local x, y = 0, 0
local pressed = false
local started = os.time()

local function handle_release()
  if pressed and os.time() - started >= 3 and y >= 730 then
    if x <= 150 then
      os.execute("touch " .. root .. "/state/force-refresh")
    elseif x >= 450 then
      os.execute("touch " .. root .. "/state/stop")
      return true
    end
  end
  pressed = false
  return false
end

while true do
  if ffi.C.poll(pollfd, 1, 500) > 0 and ffi.C.read(fd, buf, 16) == 16 then
    local kind = buf[8] + buf[9] * 256
    local code = buf[10] + buf[11] * 256
    local value = buf[12] + buf[13] * 256 + buf[14] * 65536 + buf[15] * 16777216
    if kind == 3 and (code == 0 or code == 53) then x = value end
    if kind == 3 and (code == 1 or code == 54) then y = value end
    if kind == 3 and code == 57 then
      if value == 4294967295 then
        if handle_release() then break end
      else
        pressed = true
      end
    end
    if kind == 1 and code == 330 then
      if value == 1 then
        pressed = true
      elseif value == 0 then
        if handle_release() then break end
      end
    end
  end
  local marker = io.open(root .. "/state/stop", "r")
  if marker then marker:close(); break end
end
ffi.C.ioctl(fd, EVIOCGRAB, ffi.new("int[1]", 0))
ffi.C.close(fd)
