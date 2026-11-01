# BasicTriangle — Ghi chú trao đổi

## Mục tiêu
Vẽ một tam giác cơ bản bằng Vulkan trên macOS.

## Hiện trạng môi trường (2026-10-31)
- macOS (Apple Silicon, Homebrew ở `/opt/homebrew`), có `cmake`, `clang++`.
- **Đã có LunarG Vulkan SDK 1.4.363.0** (`~/VulkanSDK/1.4.363.0`), cài toàn hệ thống vào `/usr/local`: header `/usr/local/include/vulkan`, `libvulkan.dylib`, `glslangValidator`/`glslc`, MoltenVK ICD, validation layer. (Lần kiểm tra đầu bị sót.)
- **Chưa có GLFW.** Vulkan SDK không kèm GLFW, cần `brew install glfw`. Đây là nguyên nhân lỗi "không tìm thấy GLFW/glfw3.h" khi build lần đầu (2026-11-01).
- macOS không hỗ trợ Vulkan gốc → cần **MoltenVK** (dịch Vulkan sang Metal).

## Vulkan trên macOS và trên Windows khác nhau thế nào
Code Vulkan gần như giống hệt nhau (khoảng 95%). Khác biệt nằm ở tầng bên dưới và ở vài chỗ khi khởi tạo.

| | Windows | macOS |
|---|---|---|
| Driver | Driver Vulkan gốc của NVIDIA/AMD/Intel | Không có driver gốc. **MoltenVK** chuyển Vulkan sang Metal |
| Mức hỗ trợ | Đầy đủ, chuẩn Vulkan | Một tập con gọi là "portability subset", thiếu một số tính năng |
| Surface (nối với cửa sổ) | `VK_KHR_win32_surface` | `VK_EXT_metal_surface` (dùng `CAMetalLayer`) |
| Shader | SPIR-V, driver dùng trực tiếp | SPIR-V, MoltenVK dịch sang MSL (dùng SPIRV-Cross) lúc chạy |
| Cài đặt | LunarG Vulkan SDK (installer) | LunarG SDK hoặc Homebrew (`molten-vk`, `vulkan-loader`, …) |
| Debug GPU | RenderDoc, Nsight | Không có RenderDoc. Dùng Xcode Metal capture (chỉ thấy lệnh Metal) |

**Những chỗ code phải khác trên macOS:**
1. Khi tạo instance: bật extension `VK_KHR_portability_enumeration` và đặt flag `VK_INSTANCE_CREATE_ENUMERATE_PORTABILITY_BIT_KHR`. Thiếu hai thứ này thì loader không thấy GPU (`VK_ERROR_INCOMPATIBLE_DRIVER`).
2. Khi tạo device: nếu GPU báo có `VK_KHR_portability_subset` thì **bắt buộc** phải bật nó.
3. Surface: nếu dùng GLFW thì GLFW lo phần này (`glfwGetRequiredInstanceExtensions` và `glfwCreateWindowSurface`), code giống nhau trên cả hai hệ.
4. Màn Retina: kích thước framebuffer (pixel) ≠ kích thước cửa sổ (point). Phải dùng `glfwGetFramebufferSize` khi tạo swapchain.

**Tính năng bị hạn chế trên MoltenVK:** không có geometry shader; tessellation bị giới hạn; không có wide line và chế độ vẽ point (polygon mode point); thiếu một số format ảnh. Một tam giác cơ bản **không dùng tới những thứ này**.

**Kết luận:** dùng GLFW + CMake và xử lý 2 extension portability bằng `#ifdef __APPLE__` thì cùng một code chạy được trên cả hai hệ.

## Đi ngược từ tam giác trên màn hình về các bước cần có

### Skeleton (khung chương trình)
```
main()
├── initWindow()      // GLFW tạo cửa sổ
├── initVulkan()      // tạo mọi object Vulkan, làm 1 lần
├── mainLoop()        // while (!closed) { pollEvents(); drawFrame(); }
└── cleanup()         // hủy theo thứ tự ngược lúc tạo
```
Mỗi frame, `drawFrame()` chỉ làm 3 việc:
1. **Acquire**: xin swapchain một ảnh trống để vẽ (`vkAcquireNextImageKHR`).
2. **Submit**: gửi command buffer (chứa lệnh vẽ) lên GPU (`vkQueueSubmit`).
3. **Present**: trả ảnh đã vẽ cho màn hình hiển thị (`vkQueuePresentKHR`).

### Chuỗi ngược: muốn có X thì cần Y
| # | Muốn có | Thì cần |
|---|---|---|
| 1 | Tam giác hiện trên màn hình | **Present** một ảnh của swapchain → cần *swapchain* và một *queue* hỗ trợ present |
| 2 | Ảnh đó có tam giác | **Submit** một *command buffer* đã ghi lệnh vẽ lên *graphics queue* |
| 3 | GPU không đọc/ghi lẫn lộn giữa CPU và GPU | **Đồng bộ**: semaphore "ảnh sẵn sàng", semaphore "vẽ xong", fence để CPU chờ frame trước |
| 4 | Command buffer có lệnh vẽ | Ghi lệnh: bắt đầu render pass → bind pipeline → đặt viewport/scissor → `vkCmdDraw(3 đỉnh)` → kết thúc. Command buffer được cấp từ một *command pool* |
| 5 | `vkCmdDraw` biết cách vẽ | **Graphics pipeline** = vertex shader + fragment shader (SPIR-V) + các state cố định (topology, rasterizer, blend…) + *pipeline layout* |
| 6 | Biết vẽ vào đâu | **Render pass** (mô tả attachment: format, clear màu, layout cuối `PRESENT_SRC`) + **framebuffer** gắn image view |
| 7 | Có image view | **Image views** bọc các *swapchain image* |
| 8 | Có swapchain | **Swapchain**: chọn format, present mode, kích thước (extent) theo khả năng của surface |
| 9 | Tạo được swapchain/queue | **Logical device** + lấy queue, tạo từ một **physical device** (GPU) có queue graphics + present và hỗ trợ `VK_KHR_swapchain` |
| 10 | Kiểm tra GPU có present lên cửa sổ được không | **Surface** (cầu nối Vulkan và cửa sổ) |
| 11 | Có surface | **Instance** (+ validation layer, debug messenger, extension portability trên Mac) + **cửa sổ** GLFW |

**Thứ tự viết code = đọc bảng từ dưới lên**: window → instance → surface → physical device → logical device → swapchain → image views → render pass → pipeline → framebuffers → command pool/buffer → sync objects → drawFrame.

### Mẹo để bản đầu tiên đơn giản nhất
- **Không cần vertex buffer**: viết cứng 3 đỉnh trong vertex shader rồi lấy đỉnh theo `gl_VertexIndex`.
- **Có thể bỏ render pass và framebuffer** nếu dùng *dynamic rendering* (Vulkan 1.3 / `VK_KHR_dynamic_rendering`, MoltenVK có hỗ trợ). Đổi lại phải tự chuyển layout ảnh bằng barrier. Cần chọn cách nào.

## Tổng quan cho người mới: ví Vulkan như một xưởng tranh
GPU là **họa sĩ**, cửa sổ là **bức tường treo tranh**, chương trình của bạn là **người quản lý** giao việc.

| # | Bước (tên Vulkan) | Trong xưởng tranh | Trả lời câu hỏi |
|---|---|---|---|
| **Giai đoạn 1: Kết nối** ||||
| 1 | Window (GLFW) | Bức tường trống | Tranh hiện ở đâu? |
| 2 | Instance | Đăng ký mở xưởng (+ "thầy giáo" validation layer nhắc lỗi) | Làm sao bắt đầu nói chuyện với Vulkan? |
| 3 | Surface | Móc treo gắn lên tường | Vulkan treo tranh lên cửa sổ bằng gì? |
| 4 | Physical device | Chọn họa sĩ trong danh sách | GPU nào sẽ vẽ? |
| 5 | Logical device + Queue | Ký hợp đồng với họa sĩ; queue là khay nhận phiếu việc | Làm sao giao việc cho GPU? |
| **Giai đoạn 2: Nơi vẽ** ||||
| 6 | Swapchain | Xấp 2–3 tấm toan dùng luân phiên | Vẽ lên cái gì? |
| 7 | Image views | Nhãn dán trên mỗi tấm toan ("tranh 2D, màu") | Dùng tấm toan theo cách nào? |
| 8 | Render pass | Quy trình dán trên tường: lau toan → vẽ → đem treo | Một lần vẽ gồm những công đoạn gì? |
| **Giai đoạn 3: Cách vẽ** ||||
| 9 | Shaders (vertex + fragment) | 2 công thức: chấm 3 điểm ở đâu, tô màu gì | Tam giác ở đâu, màu gì? |
| 10 | Graphics pipeline | Dây chuyền đúc sẵn, lắp công thức + mọi cài đặt | Gộp mọi cài đặt vẽ ở đâu? |
| 11 | Framebuffers | Kẹp từng tấm toan lên giá vẽ | Vẽ vào tấm toan cụ thể nào? |
| **Giai đoạn 4: Ra lệnh & lặp** ||||
| 12 | Command pool + buffer | Phiếu việc: "lau đen, dùng dây chuyền này, vẽ 3 đỉnh" | Ra lệnh vẽ thế nào? |
| 13 | Semaphore + Fence | Đèn tín hiệu ("toan trống", "vẽ xong") + chuông báo xong việc | Làm sao không ai giẫm chân ai? |
| 14 | drawFrame() | Mỗi lượt: lấy toan → giao phiếu → treo tranh | Cho tam giác hiện lên! |

- Bước 1–13 chạy **một lần** lúc khởi động. Bước 14 chạy **mỗi frame** (~60 lần/giây).
- Swapchain luân phiên toan: khách luôn thấy một tấm đã vẽ xong, trong lúc GPU vẽ tấm khác phía sau → không nháy, không rách hình.

## Các điểm đã thống nhất
- Trao đổi, hỏi đáp trước; chưa code.
- (2026-10-31) Làm trang **Xưởng ghép Vulkan** (`vulkan-builder.html`): kéo thả các khối vào khung `main()` rồi bấm Chạy. Ghép đúng thì hiện tam giác, ghép sai thì báo lỗi tương ứng.
  - Kiểm tra theo **quan hệ phụ thuộc** (cần gì có trước), không bắt một thứ tự cứng duy nhất.
  - Code viết bằng **C++17**, dùng **render pass cổ điển** (14 khối).
  - Mỗi khối có một trang code chi tiết riêng trong `blocks/<id>.html`.
  - Ghép đúng thì **xuất toàn bộ `main.cpp`** cùng shader và lệnh build.
  - Có **khối bẫy**: Instance thiếu portability (lỗi trên Mac, chạy được trên Windows), cửa sổ quên `GLFW_NO_API`, Fence không SIGNALED (chương trình treo), Vertex buffer (thừa).
  - Thiết kế code: mỗi khối là một hàm, biến toàn cục gom lên đầu file, `cleanup()` hủy theo thứ tự ngược lúc tạo. `renderFinished` dùng một semaphore cho mỗi swapchain image, nên khối Đồng bộ cần có Swapchain trước.

## Các file trong folder
- `vulkan-overview.html`: trang tổng quan 14 bước, ví von xưởng tranh.
- `vulkan-builder.html`: Xưởng ghép. Kéo thả khối, Chạy, xem kết quả, xuất code khi đúng.
- `blocks/<id>.html`: trang code chi tiết từng khối (14 khối đúng và 4 khối bẫy).
- `assets/blocks.js`: **nguồn dữ liệu duy nhất** gồm code C++, phụ thuộc, bẫy và hàm ghép `main.cpp`. Muốn sửa code một khối thì sửa ở đây.
- `assets/common.css`, `assets/block-page.css`, `assets/block-page.js`: giao diện dùng chung.
- `code/`: bản code xuất từ Xưởng ghép mà người dùng tự build (`main.cpp`, `shaders/`, `build.sh`).
- (2026-11-01) **Đã build và chạy được** trên máy: chọn GPU Apple M5, validation layer bật, không có lỗi trong vài giây chạy thử.
  - Lỗi gặp phải: `Library not loaded: @rpath/libvulkan.1.dylib`. Nguyên nhân: `build.sh` cũ chỉ có rpath `/opt/homebrew/lib`, trong khi SDK đặt `libvulkan` ở `/usr/local/lib`. Sửa bằng cách thêm `-Wl,-rpath,/usr/local/lib`.
  - Mẹo: khi tắt chương trình bằng tín hiệu, `std::cout` có thể mất output vì còn nằm trong bộ đệm. Chạy qua `script -q /dev/null ./triangle` thì output in ra ngay.

## Câu hỏi còn mở
- 
