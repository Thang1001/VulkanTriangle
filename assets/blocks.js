// Dữ liệu dùng chung cho Xưởng ghép (vulkan-builder.html) và các trang khối (blocks/*.html).
// Mỗi khối = một hàm C++. Ghép các khối theo thứ tự hợp lệ sẽ ra một main.cpp chạy được.

window.PHASES = {
  1: { name: "Kết nối", color: "var(--p1)" },
  2: { name: "Nơi vẽ", color: "var(--p2)" },
  3: { name: "Cách vẽ", color: "var(--p3)" },
  4: { name: "Ra lệnh & lặp", color: "var(--p4)" },
};

// Những thứ một khối tạo ra, để khối sau dùng
window.RESOURCES = {
  window: "cửa sổ GLFW",
  instance: "VkInstance",
  surface: "VkSurfaceKHR",
  physical: "GPU đã chọn (VkPhysicalDevice)",
  device: "VkDevice và các queue",
  swapchain: "swapchain và các ảnh của nó",
  views: "image views",
  renderpass: "render pass",
  shaders: "shader modules",
  pipeline: "graphics pipeline",
  framebuffers: "framebuffers",
  commands: "command buffer",
  sync: "semaphore và fence",
};

window.HEADER_CODE = String.raw`// main.cpp — Basic Triangle (Vulkan + GLFW, C++17)
// Ghép từ Xưởng ghép Vulkan.
#define GLFW_INCLUDE_VULKAN
#include <GLFW/glfw3.h>

#include <algorithm>
#include <cstdint>
#include <cstring>
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

const uint32_t WIDTH = 800;
const uint32_t HEIGHT = 600;

#ifdef NDEBUG
const bool enableValidation = false;
#else
const bool enableValidation = true;
#endif

// Dừng chương trình kèm tên hàm nếu một lệnh Vulkan không trả về VK_SUCCESS
void check(VkResult result, const char* what) {
    if (result != VK_SUCCESS)
        throw std::runtime_error(std::string(what) + " thất bại, VkResult = " + std::to_string(result));
}`;

window.SHADER_VERT = String.raw`#version 450
// Vertex shader: chạy 1 lần cho mỗi đỉnh (3 lần cho tam giác)

layout(location = 0) out vec3 fragColor;

// 3 đỉnh viết cứng, toạ độ trong khoảng [-1, 1], trục y hướng xuống
vec2 positions[3] = vec2[](
    vec2( 0.0, -0.5),   // đỉnh trên
    vec2( 0.5,  0.5),   // dưới phải
    vec2(-0.5,  0.5)    // dưới trái
);

vec3 colors[3] = vec3[](
    vec3(1.0, 0.0, 0.0),   // đỏ
    vec3(0.0, 1.0, 0.0),   // xanh lá
    vec3(0.0, 0.0, 1.0)    // xanh dương
);

void main() {
    gl_Position = vec4(positions[gl_VertexIndex], 0.0, 1.0);
    fragColor = colors[gl_VertexIndex];
}`;

window.SHADER_FRAG = String.raw`#version 450
// Fragment shader: chạy 1 lần cho mỗi pixel nằm trong tam giác

layout(location = 0) in vec3 fragColor;    // màu đã được nội suy giữa 3 đỉnh
layout(location = 0) out vec4 outColor;    // ghi vào color attachment số 0

void main() {
    outColor = vec4(fragColor, 1.0);
}`;

window.BUILD_SCRIPT = String.raw`#!/bin/sh
# build.sh — biên dịch và chạy trên macOS
#   Vulkan: LunarG Vulkan SDK (cài vào /usr/local, có sẵn MoltenVK, validation layer, glslangValidator)
#   GLFW:   Homebrew (SDK KHÔNG kèm GLFW)
# Cấu trúc thư mục:
#   main.cpp
#   shaders/triangle.vert
#   shaders/triangle.frag
set -e

# 1) Cài GLFW (chỉ cần một lần)
# brew install glfw

# 2) Biên dịch shader GLSL sang SPIR-V
glslangValidator -V shaders/triangle.vert -o shaders/vert.spv
glslangValidator -V shaders/triangle.frag -o shaders/frag.spv

# 3) Biên dịch chương trình
clang++ -std=c++17 -g main.cpp -o triangle \
    -I/usr/local/include -I/opt/homebrew/include \
    -L/usr/local/lib -L/opt/homebrew/lib \
    -lvulkan -lglfw \
    -Wl,-rpath,/usr/local/lib -Wl,-rpath,/opt/homebrew/lib

# 4) Chạy (đứng ở thư mục chứa shaders/)
./triangle

# Nếu báo không tìm thấy driver hoặc validation layer, thử:
# export VK_ICD_FILENAMES=/usr/local/share/vulkan/icd.d/MoltenVK_icd.json
# export VK_LAYER_PATH=/usr/local/share/vulkan/explicit_layer.d`;

window.BLOCKS = [
  // ───────────────────────── GIAI ĐOẠN 1 ─────────────────────────
  {
    id: "window", phase: 1, title: "Cửa sổ", fn: "initWindow",
    short: "Mở cửa sổ bằng GLFW",
    analogy: "Bức tường trống, nơi sẽ treo tranh.",
    needs: [], provides: ["window"],
    log: "glfwCreateWindow → cửa sổ 800×600",
    why: "Vulkan chỉ lo phần vẽ, không biết tạo cửa sổ. Thư viện GLFW tạo cửa sổ giúp ta, và chạy giống nhau trên macOS, Windows, Linux. Hàm này cũng gọi glfwInit(), nên các hàm GLFW khác (kể cả hàm hỏi extension ở khối Instance) chỉ dùng được sau khối này.",
    globals: String.raw`GLFWwindow* window = nullptr;`,
    code: String.raw`void initWindow() {
    glfwInit();

    // Mặc định GLFW tạo kèm một OpenGL context. Với Vulkan thì phải tắt đi.
    glfwWindowHint(GLFW_CLIENT_API, GLFW_NO_API);
    // Bản đầu tiên chưa xử lý đổi kích thước cửa sổ (phải tạo lại swapchain)
    glfwWindowHint(GLFW_RESIZABLE, GLFW_FALSE);

    window = glfwCreateWindow(WIDTH, HEIGHT, "Basic Triangle", nullptr, nullptr);
    if (!window)
        throw std::runtime_error("Không tạo được cửa sổ");
}`,
    cleanup: String.raw`glfwDestroyWindow(window);
glfwTerminate();`,
    call: "initWindow();",
    notes: [
      { h: "GLFW_NO_API", t: "Dòng quan trọng nhất. Nếu quên, cửa sổ bị OpenGL chiếm, và đến bước Surface Vulkan sẽ báo VK_ERROR_NATIVE_WINDOW_IN_USE_KHR." },
      { h: "GLFW_RESIZABLE = FALSE", t: "Khi cửa sổ đổi kích thước, swapchain cũ không dùng được nữa và phải tạo lại. Tắt resize để bản đầu đơn giản; xử lý sau." },
      { h: "WIDTH, HEIGHT", t: "Đây là kích thước theo point. Trên màn Retina, số pixel thật gấp đôi (1600×1200). Khối Swapchain sẽ hỏi số pixel thật." },
    ],
    pitfalls: ["Quên glfwWindowHint(GLFW_CLIENT_API, GLFW_NO_API).", "Gọi hàm GLFW khác trước glfwInit()."],
  },
  {
    id: "window_gl", phase: 1, title: "Cửa sổ (mặc định)", fn: "initWindow",
    short: "Mở cửa sổ bằng GLFW, cấu hình mặc định",
    trap: true, fixId: "window",
    analogy: "Bức tường đã bị người khác (OpenGL) dán kín giấy. Móc treo của Vulkan không gắn vào được.",
    needs: [], provides: ["window"],
    log: "glfwCreateWindow → cửa sổ 800×600 (kèm OpenGL context)",
    why: "Trông giống hệt khối Cửa sổ, chỉ thiếu một dòng glfwWindowHint(GLFW_CLIENT_API, GLFW_NO_API). Không có dòng đó, GLFW tạo cửa sổ kèm OpenGL context. Cửa sổ vẫn mở bình thường, lỗi chỉ lộ ra ở bước Surface.",
    globals: String.raw`GLFWwindow* window = nullptr;`,
    code: String.raw`void initWindow() {
    glfwInit();

    // ✗ THIẾU: glfwWindowHint(GLFW_CLIENT_API, GLFW_NO_API);
    glfwWindowHint(GLFW_RESIZABLE, GLFW_FALSE);

    window = glfwCreateWindow(WIDTH, HEIGHT, "Basic Triangle", nullptr, nullptr);
    if (!window)
        throw std::runtime_error("Không tạo được cửa sổ");
}`,
    cleanup: String.raw`glfwDestroyWindow(window);
glfwTerminate();`,
    call: "initWindow();",
    effect: { at: "surface", kind: "fail", code: "VK_ERROR_NATIVE_WINDOW_IN_USE_KHR (-1000000001)",
      msg: "glfwCreateWindowSurface thất bại: cửa sổ đã có OpenGL context. Khối Cửa sổ đang dùng thiếu dòng GLFW_NO_API." },
    notes: [
      { h: "Vì sao lỗi xuất hiện muộn", t: "glfwCreateWindow vẫn thành công. Chỉ khi Vulkan xin gắn surface vào cửa sổ, GLFW mới phát hiện cửa sổ đang thuộc về OpenGL và từ chối." },
      { h: "Cách sửa", t: "Dùng khối Cửa sổ có dòng glfwWindowHint(GLFW_CLIENT_API, GLFW_NO_API) trước glfwCreateWindow." },
    ],
    pitfalls: [],
  },
  {
    id: "instance", phase: 1, title: "Instance", fn: "createInstance",
    short: "Kết nối chương trình với Vulkan",
    analogy: "Đăng ký mở xưởng: khai tên xưởng, các dịch vụ cần dùng, và mời một “thầy giáo” (validation layer) đứng cạnh nhắc lỗi.",
    needs: ["window"], provides: ["instance"],
    log: "vkCreateInstance → VK_SUCCESS",
    why: "VkInstance là đối tượng Vulkan đầu tiên. Ở đây ta khai báo các instance extension cần dùng (GLFW cho biết cần những cái nào để nối với cửa sổ) và bật validation layer khi đang debug. Trên macOS phải thêm extension portability, nếu không loader sẽ không cho thấy MoltenVK.",
    globals: String.raw`VkInstance instance = VK_NULL_HANDLE;
const std::vector<const char*> validationLayers = {"VK_LAYER_KHRONOS_validation"};`,
    code: String.raw`bool validationLayersAvailable() {
    uint32_t count = 0;
    vkEnumerateInstanceLayerProperties(&count, nullptr);
    std::vector<VkLayerProperties> layers(count);
    vkEnumerateInstanceLayerProperties(&count, layers.data());
    for (const auto& layer : layers)
        if (std::strcmp(layer.layerName, validationLayers[0]) == 0)
            return true;
    return false;
}

void createInstance() {
    VkApplicationInfo appInfo{};
    appInfo.sType = VK_STRUCTURE_TYPE_APPLICATION_INFO;
    appInfo.pApplicationName = "Basic Triangle";
    appInfo.applicationVersion = VK_MAKE_VERSION(1, 0, 0);
    appInfo.pEngineName = "No Engine";
    appInfo.engineVersion = VK_MAKE_VERSION(1, 0, 0);
    appInfo.apiVersion = VK_API_VERSION_1_1;

    // Các extension GLFW cần để nối Vulkan với cửa sổ (VK_KHR_surface, ...)
    uint32_t glfwCount = 0;
    const char** glfwExtensions = glfwGetRequiredInstanceExtensions(&glfwCount);
    std::vector<const char*> extensions(glfwExtensions, glfwExtensions + glfwCount);

    VkInstanceCreateInfo createInfo{};
    createInfo.sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO;
    createInfo.pApplicationInfo = &appInfo;

#ifdef __APPLE__
    // MoltenVK chỉ là "portability implementation": phải xin loader liệt kê nó ra
    extensions.push_back(VK_KHR_PORTABILITY_ENUMERATION_EXTENSION_NAME);
    createInfo.flags |= VK_INSTANCE_CREATE_ENUMERATE_PORTABILITY_BIT_KHR;
#endif

    createInfo.enabledExtensionCount = static_cast<uint32_t>(extensions.size());
    createInfo.ppEnabledExtensionNames = extensions.data();

    if (enableValidation && validationLayersAvailable()) {
        createInfo.enabledLayerCount = static_cast<uint32_t>(validationLayers.size());
        createInfo.ppEnabledLayerNames = validationLayers.data();
    } else if (enableValidation) {
        std::cerr << "Cảnh báo: không tìm thấy VK_LAYER_KHRONOS_validation\n";
    }

    check(vkCreateInstance(&createInfo, nullptr, &instance), "vkCreateInstance");
}`,
    cleanup: String.raw`vkDestroyInstance(instance, nullptr);`,
    call: "createInstance();",
    notes: [
      { h: "sType", t: "Mọi struct Vulkan đều có trường sType ghi rõ đây là loại struct gì. Quên đặt là lỗi rất hay gặp. Viết {} để mọi trường khác về 0." },
      { h: "apiVersion = 1.1", t: "Vulkan 1.1 đã có sẵn VK_KHR_get_physical_device_properties2, là extension mà VK_KHR_portability_subset (bật ở khối Logical device) phụ thuộc vào." },
      { h: "glfwGetRequiredInstanceExtensions", t: "Trên macOS trả về VK_KHR_surface và VK_EXT_metal_surface. Trên Windows trả về VK_KHR_surface và VK_KHR_win32_surface. Nhờ vậy code này không phải đổi theo hệ điều hành." },
      { h: "Khối #ifdef __APPLE__", t: "Từ Vulkan loader 1.3.216, nếu không có extension và flag portability này, vkCreateInstance trên Mac trả về VK_ERROR_INCOMPATIBLE_DRIVER." },
      { h: "Validation layer", t: "Khi không đăng ký debug messenger, layer tự in lỗi ra terminal. Bật lúc phát triển, tắt khi build release (NDEBUG)." },
    ],
    pitfalls: ["Quên extension/flag portability trên macOS.", "Bật validation layer khi máy chưa cài (vulkan-validationlayers), vkCreateInstance báo VK_ERROR_LAYER_NOT_PRESENT. Code trên kiểm tra trước nên chỉ in cảnh báo."],
    mac: "Cài layer bằng brew install vulkan-validationlayers.",
  },
  {
    id: "instance_noport", phase: 1, title: "Instance (bản gọn)", fn: "createInstance",
    short: "Kết nối với Vulkan, không thêm extension phụ",
    trap: true, fixId: "instance",
    analogy: "Đăng ký mở xưởng nhưng quên ghi “nhận cả họa sĩ thuê ngoài”. Trên Mac, họa sĩ duy nhất (MoltenVK) lại là thuê ngoài, nên không ai nhận việc.",
    needs: ["window"], provides: ["instance"],
    log: "vkCreateInstance → VK_SUCCESS",
    why: "Đây là code Instance thường thấy trong các tutorial cũ: không có phần portability. Trên Windows, Linux nó chạy tốt. Trên macOS, loader không liệt kê MoltenVK (vì MoltenVK chưa phải bản Vulkan đầy đủ), nên không tạo được instance.",
    globals: String.raw`VkInstance instance = VK_NULL_HANDLE;`,
    code: String.raw`void createInstance() {
    VkApplicationInfo appInfo{};
    appInfo.sType = VK_STRUCTURE_TYPE_APPLICATION_INFO;
    appInfo.pApplicationName = "Basic Triangle";
    appInfo.apiVersion = VK_API_VERSION_1_1;

    uint32_t glfwCount = 0;
    const char** glfwExtensions = glfwGetRequiredInstanceExtensions(&glfwCount);

    VkInstanceCreateInfo createInfo{};
    createInfo.sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO;
    createInfo.pApplicationInfo = &appInfo;
    createInfo.enabledExtensionCount = glfwCount;
    createInfo.ppEnabledExtensionNames = glfwExtensions;
    // ✗ THIẾU trên macOS:
    //   VK_KHR_PORTABILITY_ENUMERATION_EXTENSION_NAME
    //   VK_INSTANCE_CREATE_ENUMERATE_PORTABILITY_BIT_KHR

    check(vkCreateInstance(&createInfo, nullptr, &instance), "vkCreateInstance");
}`,
    cleanup: String.raw`vkDestroyInstance(instance, nullptr);`,
    call: "createInstance();",
    effect: { at: "instance_noport", kind: "fail", platform: "mac", code: "VK_ERROR_INCOMPATIBLE_DRIVER (-9)",
      msg: "vkCreateInstance thất bại trên macOS: loader không liệt kê MoltenVK vì thiếu extension VK_KHR_portability_enumeration và flag ENUMERATE_PORTABILITY. (Chuyển sang Windows thì khối này chạy được.)" },
    notes: [
      { h: "Vì sao Windows không lỗi", t: "Trên Windows, driver NVIDIA/AMD/Intel là bản Vulkan đầy đủ, không cần cơ chế portability." },
      { h: "Cách sửa", t: "Dùng khối Instance có đoạn #ifdef __APPLE__ thêm extension và flag portability." },
    ],
    pitfalls: [],
  },
  {
    id: "surface", phase: 1, title: "Surface", fn: "createSurface",
    short: "Nối Vulkan với cửa sổ",
    analogy: "Gắn móc treo lên tường. Có móc, tranh từ xưởng mới treo được lên đúng bức tường này.",
    needs: ["instance", "window"], provides: ["surface"],
    log: "glfwCreateWindowSurface → VK_SUCCESS",
    why: "VkSurfaceKHR là cầu nối giữa Vulkan và cửa sổ của hệ điều hành. Trên Mac, bên dưới nó là một CAMetalLayer. Trên Windows là HWND. GLFW lo hết phần khác biệt này. Ta cần surface trước khi chọn GPU, vì phải hỏi GPU nào present được lên surface này.",
    globals: String.raw`VkSurfaceKHR surface = VK_NULL_HANDLE;`,
    code: String.raw`void createSurface() {
    check(glfwCreateWindowSurface(instance, window, nullptr, &surface),
          "glfwCreateWindowSurface");
}`,
    cleanup: String.raw`vkDestroySurfaceKHR(instance, surface, nullptr);`,
    call: "createSurface();",
    notes: [
      { h: "Một dòng thay cho nhiều dòng", t: "Nếu không dùng GLFW, trên Mac bạn phải tự tạo CAMetalLayer rồi gọi vkCreateMetalSurfaceEXT. Trên Windows thì gọi vkCreateWin32SurfaceKHR với HWND." },
      { h: "Hủy trước instance", t: "Surface thuộc về instance, nên phải hủy surface trước khi hủy instance." },
    ],
    pitfalls: ["Cửa sổ còn OpenGL context (quên GLFW_NO_API), hàm trả về VK_ERROR_NATIVE_WINDOW_IN_USE_KHR."],
  },
  {
    id: "physical", phase: 1, title: "Physical device", fn: "pickPhysicalDevice",
    short: "Chọn GPU để dùng",
    analogy: "Xem danh sách họa sĩ trong thị trấn, rồi chọn người vẽ được và treo được tranh lên móc của bạn.",
    needs: ["instance", "surface"], provides: ["physical"],
    log: "vkEnumeratePhysicalDevices → chọn Apple M-series GPU",
    why: "Liệt kê các GPU mà Vulkan thấy, rồi chọn GPU đầu tiên đủ điều kiện: hỗ trợ swapchain, có một queue family vẽ được (GRAPHICS) và một queue family present được lên surface. Ta ghi lại chỉ số hai queue family đó để khối sau dùng.",
    globals: String.raw`VkPhysicalDevice physicalDevice = VK_NULL_HANDLE;
uint32_t graphicsFamily = UINT32_MAX;
uint32_t presentFamily = UINT32_MAX;`,
    code: String.raw`bool hasDeviceExtension(VkPhysicalDevice dev, const char* name) {
    uint32_t count = 0;
    vkEnumerateDeviceExtensionProperties(dev, nullptr, &count, nullptr);
    std::vector<VkExtensionProperties> extensions(count);
    vkEnumerateDeviceExtensionProperties(dev, nullptr, &count, extensions.data());
    for (const auto& ext : extensions)
        if (std::strcmp(ext.extensionName, name) == 0)
            return true;
    return false;
}

void pickPhysicalDevice() {
    uint32_t count = 0;
    vkEnumeratePhysicalDevices(instance, &count, nullptr);
    if (count == 0)
        throw std::runtime_error("Không tìm thấy GPU nào hỗ trợ Vulkan");
    std::vector<VkPhysicalDevice> devices(count);
    vkEnumeratePhysicalDevices(instance, &count, devices.data());

    for (VkPhysicalDevice dev : devices) {
        if (!hasDeviceExtension(dev, VK_KHR_SWAPCHAIN_EXTENSION_NAME))
            continue;

        uint32_t familyCount = 0;
        vkGetPhysicalDeviceQueueFamilyProperties(dev, &familyCount, nullptr);
        std::vector<VkQueueFamilyProperties> families(familyCount);
        vkGetPhysicalDeviceQueueFamilyProperties(dev, &familyCount, families.data());

        uint32_t graphics = UINT32_MAX, present = UINT32_MAX;
        for (uint32_t i = 0; i < familyCount; i++) {
            if (graphics == UINT32_MAX && (families[i].queueFlags & VK_QUEUE_GRAPHICS_BIT))
                graphics = i;
            VkBool32 canPresent = VK_FALSE;
            vkGetPhysicalDeviceSurfaceSupportKHR(dev, i, surface, &canPresent);
            if (present == UINT32_MAX && canPresent)
                present = i;
        }

        if (graphics != UINT32_MAX && present != UINT32_MAX) {
            physicalDevice = dev;
            graphicsFamily = graphics;
            presentFamily = present;

            VkPhysicalDeviceProperties props;
            vkGetPhysicalDeviceProperties(dev, &props);
            std::cout << "GPU: " << props.deviceName << "\n";
            return;
        }
    }
    throw std::runtime_error("Không có GPU nào vẽ và present được lên cửa sổ này");
}`,
    cleanup: "",
    call: "pickPhysicalDevice();",
    notes: [
      { h: "Mẫu gọi 2 lần", t: "Rất nhiều hàm Vulkan dùng mẫu này: gọi lần 1 với nullptr để lấy số lượng, cấp mảng, gọi lần 2 để lấy dữ liệu." },
      { h: "Queue family", t: "GPU có nhiều nhóm hàng đợi (family), mỗi nhóm làm được một số loại việc: vẽ, tính toán, chép dữ liệu, present. Trên Mac thường một family làm được hết." },
      { h: "Không cần hủy", t: "Physical device là GPU thật, ta chỉ chọn nó, không tạo ra, nên không có lệnh hủy." },
    ],
    pitfalls: ["Chọn GPU không present được lên surface, đến khi tạo swapchain mới lỗi."],
  },
  {
    id: "device", phase: 1, title: "Logical device + Queue", fn: "createLogicalDevice",
    short: "Mở phiên làm việc với GPU, lấy hàng đợi",
    analogy: "Ký hợp đồng với họa sĩ đã chọn. Họa sĩ đưa bạn một khay nhận việc (queue): muốn giao việc thì bỏ phiếu vào khay.",
    needs: ["physical"], provides: ["device"],
    log: "vkCreateDevice → VK_SUCCESS, lấy graphics queue và present queue",
    why: "VkDevice là “phiên làm việc” của bạn với GPU. Hầu hết các đối tượng về sau (swapchain, pipeline, buffer...) đều tạo từ device. Khi tạo device ta xin các queue cần dùng và bật device extension VK_KHR_swapchain. Trên Mac còn phải bật VK_KHR_portability_subset.",
    globals: String.raw`VkDevice device = VK_NULL_HANDLE;
VkQueue graphicsQueue = VK_NULL_HANDLE;
VkQueue presentQueue = VK_NULL_HANDLE;`,
    code: String.raw`void createLogicalDevice() {
    // Xin 1 queue từ mỗi family cần dùng (thường graphics và present là cùng 1 family)
    std::vector<uint32_t> families = {graphicsFamily};
    if (presentFamily != graphicsFamily)
        families.push_back(presentFamily);

    float priority = 1.0f;
    std::vector<VkDeviceQueueCreateInfo> queueInfos;
    for (uint32_t family : families) {
        VkDeviceQueueCreateInfo info{};
        info.sType = VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO;
        info.queueFamilyIndex = family;
        info.queueCount = 1;
        info.pQueuePriorities = &priority;
        queueInfos.push_back(info);
    }

    std::vector<const char*> extensions = {VK_KHR_SWAPCHAIN_EXTENSION_NAME};
    // MoltenVK báo có VK_KHR_portability_subset: theo spec, khi đó BẮT BUỘC phải bật
    if (hasDeviceExtension(physicalDevice, "VK_KHR_portability_subset"))
        extensions.push_back("VK_KHR_portability_subset");

    VkPhysicalDeviceFeatures features{};   // tam giác cơ bản không cần tính năng đặc biệt

    VkDeviceCreateInfo createInfo{};
    createInfo.sType = VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO;
    createInfo.queueCreateInfoCount = static_cast<uint32_t>(queueInfos.size());
    createInfo.pQueueCreateInfos = queueInfos.data();
    createInfo.enabledExtensionCount = static_cast<uint32_t>(extensions.size());
    createInfo.ppEnabledExtensionNames = extensions.data();
    createInfo.pEnabledFeatures = &features;

    check(vkCreateDevice(physicalDevice, &createInfo, nullptr, &device), "vkCreateDevice");

    vkGetDeviceQueue(device, graphicsFamily, 0, &graphicsQueue);
    vkGetDeviceQueue(device, presentFamily, 0, &presentQueue);
}`,
    cleanup: String.raw`vkDestroyDevice(device, nullptr);`,
    call: "createLogicalDevice();",
    notes: [
      { h: "Queue không cần tạo", t: "Queue được tạo cùng device. Ta chỉ lấy handle của nó bằng vkGetDeviceQueue, và nó tự mất khi hủy device." },
      { h: "Không trùng family", t: "Nếu graphics và present cùng family mà ta xin 2 lần cho cùng family đó, validation layer sẽ báo lỗi. Vì vậy mới có đoạn kiểm tra trùng." },
      { h: "hasDeviceExtension", t: "Hàm này được viết ở khối Physical device. Vì vậy trong main.cpp, khối này phải nằm sau khối Physical device." },
    ],
    pitfalls: ["Quên VK_KHR_swapchain, khối Swapchain sẽ không có hàm để gọi.", "Trên Mac quên VK_KHR_portability_subset, validation layer báo lỗi."],
  },
  // ───────────────────────── GIAI ĐOẠN 2 ─────────────────────────
  {
    id: "swapchain", phase: 2, title: "Swapchain", fn: "createSwapchain",
    short: "Tạo xấp ảnh luân phiên để vẽ và hiển thị",
    analogy: "Một xấp vài tấm toan dùng luân phiên: một tấm đang treo cho khách xem, những tấm khác đang vẽ hoặc chờ.",
    needs: ["device", "surface", "window"], provides: ["swapchain"],
    log: "vkCreateSwapchainKHR → 3 ảnh B8G8R8A8_SRGB, 1600×1200 px",
    why: "Swapchain là bộ ảnh gắn với surface. Ta vẽ vào một ảnh, rồi đưa ảnh đó cho màn hình (present). Khi tạo cần chọn 3 thứ: định dạng màu (format), kích thước bằng pixel (extent), và cách đổi ảnh (present mode).",
    globals: String.raw`VkSwapchainKHR swapchain = VK_NULL_HANDLE;
std::vector<VkImage> swapchainImages;
VkFormat swapchainFormat = VK_FORMAT_UNDEFINED;
VkExtent2D swapchainExtent{};`,
    code: String.raw`void createSwapchain() {
    VkSurfaceCapabilitiesKHR caps;
    vkGetPhysicalDeviceSurfaceCapabilitiesKHR(physicalDevice, surface, &caps);

    // 1) Định dạng màu: ưu tiên BGRA 8-bit sRGB, không có thì lấy cái đầu tiên
    uint32_t formatCount = 0;
    vkGetPhysicalDeviceSurfaceFormatsKHR(physicalDevice, surface, &formatCount, nullptr);
    std::vector<VkSurfaceFormatKHR> formats(formatCount);
    vkGetPhysicalDeviceSurfaceFormatsKHR(physicalDevice, surface, &formatCount, formats.data());
    VkSurfaceFormatKHR chosen = formats[0];
    for (const auto& f : formats)
        if (f.format == VK_FORMAT_B8G8R8A8_SRGB && f.colorSpace == VK_COLOR_SPACE_SRGB_NONLINEAR_KHR) {
            chosen = f;
            break;
        }

    // 2) Kích thước: số pixel thật (màn Retina gấp đôi số point của cửa sổ)
    VkExtent2D extent = caps.currentExtent;
    if (extent.width == UINT32_MAX) {
        int w, h;
        glfwGetFramebufferSize(window, &w, &h);
        extent.width  = std::clamp(static_cast<uint32_t>(w), caps.minImageExtent.width,  caps.maxImageExtent.width);
        extent.height = std::clamp(static_cast<uint32_t>(h), caps.minImageExtent.height, caps.maxImageExtent.height);
    }

    // Xin nhiều hơn mức tối thiểu 1 ảnh để GPU ít phải chờ
    uint32_t imageCount = caps.minImageCount + 1;
    if (caps.maxImageCount > 0 && imageCount > caps.maxImageCount)
        imageCount = caps.maxImageCount;

    VkSwapchainCreateInfoKHR createInfo{};
    createInfo.sType = VK_STRUCTURE_TYPE_SWAPCHAIN_CREATE_INFO_KHR;
    createInfo.surface = surface;
    createInfo.minImageCount = imageCount;
    createInfo.imageFormat = chosen.format;
    createInfo.imageColorSpace = chosen.colorSpace;
    createInfo.imageExtent = extent;
    createInfo.imageArrayLayers = 1;
    createInfo.imageUsage = VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT;   // dùng làm chỗ vẽ màu

    uint32_t familyIndices[] = {graphicsFamily, presentFamily};
    if (graphicsFamily != presentFamily) {
        createInfo.imageSharingMode = VK_SHARING_MODE_CONCURRENT;
        createInfo.queueFamilyIndexCount = 2;
        createInfo.pQueueFamilyIndices = familyIndices;
    } else {
        createInfo.imageSharingMode = VK_SHARING_MODE_EXCLUSIVE;
    }

    createInfo.preTransform = caps.currentTransform;
    createInfo.compositeAlpha = VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR;
    // 3) FIFO: đổi ảnh theo nhịp quét màn hình (V-Sync). Mọi máy đều hỗ trợ.
    createInfo.presentMode = VK_PRESENT_MODE_FIFO_KHR;
    createInfo.clipped = VK_TRUE;

    check(vkCreateSwapchainKHR(device, &createInfo, nullptr, &swapchain), "vkCreateSwapchainKHR");

    vkGetSwapchainImagesKHR(device, swapchain, &imageCount, nullptr);
    swapchainImages.resize(imageCount);
    vkGetSwapchainImagesKHR(device, swapchain, &imageCount, swapchainImages.data());

    swapchainFormat = chosen.format;
    swapchainExtent = extent;
}`,
    cleanup: String.raw`vkDestroySwapchainKHR(device, swapchain, nullptr);`,
    call: "createSwapchain();",
    notes: [
      { h: "Ảnh thuộc về swapchain", t: "Các VkImage lấy từ vkGetSwapchainImagesKHR do swapchain sở hữu. Ta không tự hủy chúng; hủy swapchain là chúng mất theo." },
      { h: "Số ảnh có thể khác số xin", t: "minImageCount chỉ là mức tối thiểu. Driver có thể cho nhiều hơn, nên phải hỏi lại số ảnh thật sau khi tạo." },
      { h: "Present mode", t: "FIFO giống V-Sync, luôn có sẵn. MAILBOX vẽ nhanh nhất có thể mà không rách hình, nhưng không phải máy nào cũng có." },
      { h: "Retina", t: "Trên Mac, caps.currentExtent thường đã có số pixel thật. Nhánh glfwGetFramebufferSize dành cho hệ thống để trống giá trị này (UINT32_MAX)." },
    ],
    pitfalls: ["Dùng WIDTH/HEIGHT (point) thay vì pixel thật, hình bị mờ hoặc validation báo lỗi extent.", "Quên imageUsage = COLOR_ATTACHMENT."],
  },
  {
    id: "views", phase: 2, title: "Image views", fn: "createImageViews",
    short: "Mô tả cách đọc từng ảnh của swapchain",
    analogy: "Dán nhãn cho từng tấm toan: “tranh 2D, màu, dùng cả tấm”, để ai cầm lên cũng biết cách dùng.",
    needs: ["swapchain"], provides: ["views"],
    log: "vkCreateImageView ×3 → VK_SUCCESS",
    why: "VkImage chỉ là một vùng bộ nhớ ảnh. Muốn dùng nó làm chỗ vẽ, Vulkan cần một VkImageView mô tả cách nhìn vào vùng đó: ảnh 2D, định dạng gì, dùng mip level và layer nào. Mỗi ảnh swapchain cần một view.",
    globals: String.raw`std::vector<VkImageView> swapchainImageViews;`,
    code: String.raw`void createImageViews() {
    swapchainImageViews.resize(swapchainImages.size());

    for (size_t i = 0; i < swapchainImages.size(); i++) {
        VkImageViewCreateInfo createInfo{};
        createInfo.sType = VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO;
        createInfo.image = swapchainImages[i];
        createInfo.viewType = VK_IMAGE_VIEW_TYPE_2D;
        createInfo.format = swapchainFormat;
        // components để mặc định = IDENTITY: giữ nguyên các kênh R, G, B, A

        // Dùng phần màu, 1 mip level, 1 layer
        createInfo.subresourceRange.aspectMask = VK_IMAGE_ASPECT_COLOR_BIT;
        createInfo.subresourceRange.baseMipLevel = 0;
        createInfo.subresourceRange.levelCount = 1;
        createInfo.subresourceRange.baseArrayLayer = 0;
        createInfo.subresourceRange.layerCount = 1;

        check(vkCreateImageView(device, &createInfo, nullptr, &swapchainImageViews[i]),
              "vkCreateImageView");
    }
}`,
    cleanup: String.raw`for (VkImageView view : swapchainImageViews)
    vkDestroyImageView(device, view, nullptr);`,
    call: "createImageViews();",
    notes: [
      { h: "Image và image view", t: "Giống tệp dữ liệu và cách mở tệp: cùng một ảnh có thể có nhiều view khác nhau (ví dụ chỉ xem một layer)." },
      { h: "Format phải khớp", t: "format của view lấy đúng swapchainFormat đã chọn ở khối Swapchain." },
    ],
    pitfalls: ["Quên levelCount/layerCount = 1 (để 0 là không hợp lệ)."],
  },
  {
    id: "renderpass", phase: 2, title: "Render pass", fn: "createRenderPass",
    short: "Quy trình một lần vẽ: xóa, vẽ, giữ lại",
    analogy: "Bản quy trình dán trên tường xưởng: lau toan về màu nền → vẽ → để sẵn đem đi treo.",
    needs: ["device", "swapchain"], provides: ["renderpass"],
    log: "vkCreateRenderPass → 1 color attachment, 1 subpass",
    why: "Render pass mô tả trước các ảnh sẽ dùng khi vẽ (attachment) và việc làm với chúng ở đầu và cuối: xóa về một màu (CLEAR), vẽ xong thì giữ lại (STORE), và chuyển ảnh sang layout PRESENT_SRC để đem đi hiển thị. Nó cần biết format của swapchain.",
    globals: String.raw`VkRenderPass renderPass = VK_NULL_HANDLE;`,
    code: String.raw`void createRenderPass() {
    VkAttachmentDescription color{};
    color.format = swapchainFormat;
    color.samples = VK_SAMPLE_COUNT_1_BIT;                 // không khử răng cưa
    color.loadOp = VK_ATTACHMENT_LOAD_OP_CLEAR;            // đầu: xóa về màu nền
    color.storeOp = VK_ATTACHMENT_STORE_OP_STORE;          // cuối: giữ kết quả
    color.stencilLoadOp = VK_ATTACHMENT_LOAD_OP_DONT_CARE;
    color.stencilStoreOp = VK_ATTACHMENT_STORE_OP_DONT_CARE;
    color.initialLayout = VK_IMAGE_LAYOUT_UNDEFINED;       // không quan tâm nội dung cũ
    color.finalLayout = VK_IMAGE_LAYOUT_PRESENT_SRC_KHR;   // sẵn sàng đem đi hiển thị

    VkAttachmentReference colorRef{};
    colorRef.attachment = 0;                               // attachment số 0 ở trên
    colorRef.layout = VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL;

    VkSubpassDescription subpass{};
    subpass.pipelineBindPoint = VK_PIPELINE_BIND_POINT_GRAPHICS;
    subpass.colorAttachmentCount = 1;
    subpass.pColorAttachments = &colorRef;                 // layout(location = 0) trong fragment shader

    // Chờ ảnh thật sự sẵn sàng (semaphore imageAvailable) rồi mới ghi màu vào
    VkSubpassDependency dependency{};
    dependency.srcSubpass = VK_SUBPASS_EXTERNAL;
    dependency.dstSubpass = 0;
    dependency.srcStageMask = VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT;
    dependency.srcAccessMask = 0;
    dependency.dstStageMask = VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT;
    dependency.dstAccessMask = VK_ACCESS_COLOR_ATTACHMENT_WRITE_BIT;

    VkRenderPassCreateInfo createInfo{};
    createInfo.sType = VK_STRUCTURE_TYPE_RENDER_PASS_CREATE_INFO;
    createInfo.attachmentCount = 1;
    createInfo.pAttachments = &color;
    createInfo.subpassCount = 1;
    createInfo.pSubpasses = &subpass;
    createInfo.dependencyCount = 1;
    createInfo.pDependencies = &dependency;

    check(vkCreateRenderPass(device, &createInfo, nullptr, &renderPass), "vkCreateRenderPass");
}`,
    cleanup: String.raw`vkDestroyRenderPass(device, renderPass, nullptr);`,
    call: "createRenderPass();",
    notes: [
      { h: "Image layout", t: "GPU sắp xếp dữ liệu ảnh khác nhau tùy mục đích. UNDEFINED → COLOR_ATTACHMENT_OPTIMAL (lúc vẽ) → PRESENT_SRC_KHR (lúc hiển thị). Render pass tự chuyển giúp ta." },
      { h: "Subpass", t: "Một render pass có thể có nhiều bước con (subpass). Tam giác cơ bản chỉ cần 1." },
      { h: "Subpass dependency", t: "Đảm bảo bước ghi màu đợi đến khi swapchain thật sự trả ảnh (semaphore imageAvailable trong drawFrame). Thiếu nó, validation layer có thể báo lỗi đồng bộ." },
    ],
    pitfalls: ["finalLayout không phải PRESENT_SRC_KHR, validation báo lỗi khi present.", "loadOp = LOAD với initialLayout UNDEFINED, nội dung là rác."],
  },
  // ───────────────────────── GIAI ĐOẠN 3 ─────────────────────────
  {
    id: "shaders", phase: 3, title: "Shaders", fn: "createShaderModules",
    short: "Nạp vertex và fragment shader (SPIR-V)",
    analogy: "Hai công thức cho họa sĩ. Công thức 1: chấm 3 điểm ở đâu. Công thức 2: mỗi điểm bên trong tô màu gì.",
    needs: ["device"], provides: ["shaders"],
    log: "vkCreateShaderModule ×2 (vert.spv, frag.spv) → VK_SUCCESS",
    why: "Shader là chương trình nhỏ chạy trên GPU. Ta viết bằng GLSL, dùng glslangValidator biên dịch trước thành SPIR-V (file .spv), rồi lúc chạy đọc file đó và tạo VkShaderModule. Trên Mac, MoltenVK dịch tiếp SPIR-V sang Metal Shading Language.",
    globals: String.raw`VkShaderModule vertShader = VK_NULL_HANDLE;
VkShaderModule fragShader = VK_NULL_HANDLE;`,
    code: String.raw`std::vector<char> readFile(const std::string& path) {
    std::ifstream file(path, std::ios::ate | std::ios::binary);   // mở ở cuối để biết kích thước
    if (!file)
        throw std::runtime_error("Không mở được " + path + " (đã biên dịch shader chưa?)");
    size_t size = static_cast<size_t>(file.tellg());
    std::vector<char> buffer(size);
    file.seekg(0);
    file.read(buffer.data(), size);
    return buffer;
}

VkShaderModule createShaderModule(const std::vector<char>& code) {
    VkShaderModuleCreateInfo createInfo{};
    createInfo.sType = VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO;
    createInfo.codeSize = code.size();                                       // tính bằng byte
    createInfo.pCode = reinterpret_cast<const uint32_t*>(code.data());       // SPIR-V là các từ 32-bit
    VkShaderModule module;
    check(vkCreateShaderModule(device, &createInfo, nullptr, &module), "vkCreateShaderModule");
    return module;
}

void createShaderModules() {
    vertShader = createShaderModule(readFile("shaders/vert.spv"));
    fragShader = createShaderModule(readFile("shaders/frag.spv"));
}`,
    cleanup: String.raw`vkDestroyShaderModule(device, fragShader, nullptr);
vkDestroyShaderModule(device, vertShader, nullptr);`,
    call: "createShaderModules();",
    extra: [
      { title: "shaders/triangle.vert", lang: "glsl", src: "SHADER_VERT" },
      { title: "shaders/triangle.frag", lang: "glsl", src: "SHADER_FRAG" },
    ],
    notes: [
      { h: "Không cần vertex buffer", t: "3 đỉnh nằm sẵn trong vertex shader. gl_VertexIndex là số thứ tự đỉnh (0, 1, 2) khi gọi vkCmdDraw(cmd, 3, ...)." },
      { h: "Màu được nội suy", t: "Vertex shader gán mỗi đỉnh một màu. GPU tự trộn màu cho các pixel ở giữa, nên tam giác chuyển màu mượt." },
      { h: "Đường dẫn tương đối", t: "\"shaders/vert.spv\" tính từ thư mục bạn đứng khi chạy ./triangle, không phải thư mục chứa file thực thi." },
      { h: "Có thể hủy sớm", t: "Sau khi tạo pipeline xong, shader module không còn cần nữa. Ở đây để hủy trong cleanup cho đơn giản." },
    ],
    pitfalls: ["Quên biên dịch .vert/.frag sang .spv.", "Chạy chương trình từ thư mục khác, không tìm thấy file shader."],
  },
  {
    id: "pipeline", phase: 3, title: "Graphics pipeline", fn: "createGraphicsPipeline",
    short: "Gộp shader và mọi cài đặt vẽ thành một khối",
    analogy: "Đúc một dây chuyền cố định: lắp sẵn 2 công thức và mọi lựa chọn (vẽ tam giác, tô kín, không trộn màu). Đúc thì tốn công, dùng thì rất nhanh.",
    needs: ["shaders", "renderpass"], provides: ["pipeline"],
    log: "vkCreateGraphicsPipelines → VK_SUCCESS",
    why: "Trong OpenGL, trạng thái vẽ có thể đổi bất cứ lúc nào. Vulkan bắt ta khai báo hết một lần trong graphics pipeline: shader, kiểu hình (topology), rasterizer, blend... Driver nhờ vậy tối ưu sẵn từ đầu. Đây là khối code dài nhất. Viewport và scissor để dạng dynamic, đặt lúc ghi lệnh.",
    globals: String.raw`VkPipelineLayout pipelineLayout = VK_NULL_HANDLE;
VkPipeline graphicsPipeline = VK_NULL_HANDLE;`,
    code: String.raw`void createGraphicsPipeline() {
    // Shader: hàm main() của vertex và fragment shader
    VkPipelineShaderStageCreateInfo stages[2]{};
    stages[0].sType = VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO;
    stages[0].stage = VK_SHADER_STAGE_VERTEX_BIT;
    stages[0].module = vertShader;
    stages[0].pName = "main";
    stages[1].sType = VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO;
    stages[1].stage = VK_SHADER_STAGE_FRAGMENT_BIT;
    stages[1].module = fragShader;
    stages[1].pName = "main";

    // Đầu vào đỉnh: trống, vì đỉnh viết cứng trong shader
    VkPipelineVertexInputStateCreateInfo vertexInput{};
    vertexInput.sType = VK_STRUCTURE_TYPE_PIPELINE_VERTEX_INPUT_STATE_CREATE_INFO;

    // Mỗi 3 đỉnh tạo thành 1 tam giác
    VkPipelineInputAssemblyStateCreateInfo inputAssembly{};
    inputAssembly.sType = VK_STRUCTURE_TYPE_PIPELINE_INPUT_ASSEMBLY_STATE_CREATE_INFO;
    inputAssembly.topology = VK_PRIMITIVE_TOPOLOGY_TRIANGLE_LIST;

    // 1 viewport, 1 scissor; giá trị cụ thể đặt lúc ghi lệnh (dynamic state)
    VkPipelineViewportStateCreateInfo viewportState{};
    viewportState.sType = VK_STRUCTURE_TYPE_PIPELINE_VIEWPORT_STATE_CREATE_INFO;
    viewportState.viewportCount = 1;
    viewportState.scissorCount = 1;

    // Rasterizer: biến tam giác thành các pixel
    VkPipelineRasterizationStateCreateInfo rasterizer{};
    rasterizer.sType = VK_STRUCTURE_TYPE_PIPELINE_RASTERIZATION_STATE_CREATE_INFO;
    rasterizer.polygonMode = VK_POLYGON_MODE_FILL;     // tô kín
    rasterizer.lineWidth = 1.0f;
    rasterizer.cullMode = VK_CULL_MODE_NONE;           // vẽ cả hai mặt
    rasterizer.frontFace = VK_FRONT_FACE_CLOCKWISE;

    VkPipelineMultisampleStateCreateInfo multisample{};
    multisample.sType = VK_STRUCTURE_TYPE_PIPELINE_MULTISAMPLE_STATE_CREATE_INFO;
    multisample.rasterizationSamples = VK_SAMPLE_COUNT_1_BIT;

    // Không trộn màu: ghi đè thẳng cả 4 kênh
    VkPipelineColorBlendAttachmentState blendAttachment{};
    blendAttachment.colorWriteMask = VK_COLOR_COMPONENT_R_BIT | VK_COLOR_COMPONENT_G_BIT |
                                     VK_COLOR_COMPONENT_B_BIT | VK_COLOR_COMPONENT_A_BIT;
    blendAttachment.blendEnable = VK_FALSE;

    VkPipelineColorBlendStateCreateInfo colorBlend{};
    colorBlend.sType = VK_STRUCTURE_TYPE_PIPELINE_COLOR_BLEND_STATE_CREATE_INFO;
    colorBlend.attachmentCount = 1;
    colorBlend.pAttachments = &blendAttachment;

    VkDynamicState dynamicStates[] = {VK_DYNAMIC_STATE_VIEWPORT, VK_DYNAMIC_STATE_SCISSOR};
    VkPipelineDynamicStateCreateInfo dynamicState{};
    dynamicState.sType = VK_STRUCTURE_TYPE_PIPELINE_DYNAMIC_STATE_CREATE_INFO;
    dynamicState.dynamicStateCount = 2;
    dynamicState.pDynamicStates = dynamicStates;

    // Layout: mô tả dữ liệu ngoài (uniform, push constant). Tam giác không dùng nên để trống.
    VkPipelineLayoutCreateInfo layoutInfo{};
    layoutInfo.sType = VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO;
    check(vkCreatePipelineLayout(device, &layoutInfo, nullptr, &pipelineLayout), "vkCreatePipelineLayout");

    VkGraphicsPipelineCreateInfo createInfo{};
    createInfo.sType = VK_STRUCTURE_TYPE_GRAPHICS_PIPELINE_CREATE_INFO;
    createInfo.stageCount = 2;
    createInfo.pStages = stages;
    createInfo.pVertexInputState = &vertexInput;
    createInfo.pInputAssemblyState = &inputAssembly;
    createInfo.pViewportState = &viewportState;
    createInfo.pRasterizationState = &rasterizer;
    createInfo.pMultisampleState = &multisample;
    createInfo.pColorBlendState = &colorBlend;
    createInfo.pDynamicState = &dynamicState;
    createInfo.layout = pipelineLayout;
    createInfo.renderPass = renderPass;     // pipeline này dùng với render pass nào
    createInfo.subpass = 0;

    check(vkCreateGraphicsPipelines(device, VK_NULL_HANDLE, 1, &createInfo, nullptr, &graphicsPipeline),
          "vkCreateGraphicsPipelines");
}`,
    cleanup: String.raw`vkDestroyPipeline(device, graphicsPipeline, nullptr);
vkDestroyPipelineLayout(device, pipelineLayout, nullptr);`,
    call: "createGraphicsPipeline();",
    notes: [
      { h: "Các tầng của pipeline", t: "Đỉnh → vertex shader → ghép thành tam giác → rasterizer (tạo pixel) → fragment shader (tô màu) → blend → ghi vào ảnh." },
      { h: "Dynamic state", t: "Viewport và scissor để dynamic, nên không cần biết kích thước swapchain lúc tạo pipeline. Lúc đổi kích thước cửa sổ cũng không phải tạo lại pipeline." },
      { h: "cullMode NONE", t: "Không bỏ mặt nào, nên dù đỉnh xếp theo chiều nào tam giác vẫn hiện. Khi vẽ mô hình 3D mới cần bật cull." },
      { h: "Gắn với render pass", t: "Pipeline phải biết nó vẽ trong render pass nào. Đó là lý do khối này cần khối Render pass có trước." },
    ],
    pitfalls: ["Quên sType ở một trong nhiều struct.", "lineWidth = 0 (phải là 1.0)."],
    mac: "MoltenVK không hỗ trợ polygonMode = POINT và lineWidth khác 1.0.",
  },
  {
    id: "framebuffers", phase: 3, title: "Framebuffers", fn: "createFramebuffers",
    short: "Gắn render pass vào từng ảnh cụ thể",
    analogy: "Kẹp từng tấm toan vào giá vẽ theo đúng quy trình. Có 3 tấm thì cần 3 giá.",
    needs: ["renderpass", "views"], provides: ["framebuffers"],
    log: "vkCreateFramebuffer ×3 → VK_SUCCESS",
    why: "Render pass chỉ mô tả “sẽ có một ảnh màu”. Framebuffer chỉ rõ ảnh đó là image view nào. Vì mỗi frame ta vẽ vào một ảnh swapchain khác nhau, nên cần một framebuffer cho mỗi image view.",
    globals: String.raw`std::vector<VkFramebuffer> framebuffers;`,
    code: String.raw`void createFramebuffers() {
    framebuffers.resize(swapchainImageViews.size());

    for (size_t i = 0; i < swapchainImageViews.size(); i++) {
        VkFramebufferCreateInfo createInfo{};
        createInfo.sType = VK_STRUCTURE_TYPE_FRAMEBUFFER_CREATE_INFO;
        createInfo.renderPass = renderPass;
        createInfo.attachmentCount = 1;
        createInfo.pAttachments = &swapchainImageViews[i];   // attachment số 0 = ảnh swapchain thứ i
        createInfo.width = swapchainExtent.width;
        createInfo.height = swapchainExtent.height;
        createInfo.layers = 1;

        check(vkCreateFramebuffer(device, &createInfo, nullptr, &framebuffers[i]), "vkCreateFramebuffer");
    }
}`,
    cleanup: String.raw`for (VkFramebuffer fb : framebuffers)
    vkDestroyFramebuffer(device, fb, nullptr);`,
    call: "createFramebuffers();",
    notes: [
      { h: "Thứ tự attachment", t: "pAttachments phải xếp đúng thứ tự attachment đã khai báo trong render pass. Ở đây chỉ có 1." },
      { h: "Khi dùng dynamic rendering", t: "Với Vulkan 1.3 dynamic rendering, không cần render pass lẫn framebuffer. Ta truyền image view thẳng vào lệnh vẽ." },
    ],
    pitfalls: ["Kích thước framebuffer khác kích thước image view."],
  },
  // ───────────────────────── GIAI ĐOẠN 4 ─────────────────────────
  {
    id: "commands", phase: 4, title: "Command pool + buffer", fn: "createCommandBuffer",
    short: "Chuẩn bị phiếu ghi lệnh vẽ",
    analogy: "Lấy một tập giấy (pool) và một tờ phiếu việc (command buffer). Nội dung phiếu: “lau toan màu đen, dùng dây chuyền này, vẽ 3 đỉnh”.",
    needs: ["device"], provides: ["commands"],
    log: "vkCreateCommandPool + vkAllocateCommandBuffers → VK_SUCCESS",
    why: "Vulkan không vẽ ngay khi ta gọi hàm. Ta ghi các lệnh vào command buffer, rồi gửi cả buffer lên queue một lượt. Khối này tạo pool và buffer (một lần), và viết sẵn hàm recordCommandBuffer để drawFrame gọi mỗi frame. Lệnh vẽ thật sự chỉ có một dòng: vkCmdDraw.",
    globals: String.raw`VkCommandPool commandPool = VK_NULL_HANDLE;
VkCommandBuffer commandBuffer = VK_NULL_HANDLE;`,
    code: String.raw`void createCommandBuffer() {
    VkCommandPoolCreateInfo poolInfo{};
    poolInfo.sType = VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO;
    poolInfo.flags = VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT;   // cho phép ghi lại từng buffer
    poolInfo.queueFamilyIndex = graphicsFamily;                          // buffer sẽ gửi lên graphics queue
    check(vkCreateCommandPool(device, &poolInfo, nullptr, &commandPool), "vkCreateCommandPool");

    VkCommandBufferAllocateInfo allocInfo{};
    allocInfo.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO;
    allocInfo.commandPool = commandPool;
    allocInfo.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY;
    allocInfo.commandBufferCount = 1;
    check(vkAllocateCommandBuffers(device, &allocInfo, &commandBuffer), "vkAllocateCommandBuffers");
}

// Gọi mỗi frame từ drawFrame(): ghi lệnh vẽ vào ảnh swapchain số imageIndex
void recordCommandBuffer(VkCommandBuffer cmd, uint32_t imageIndex) {
    VkCommandBufferBeginInfo beginInfo{};
    beginInfo.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO;
    check(vkBeginCommandBuffer(cmd, &beginInfo), "vkBeginCommandBuffer");

    VkClearValue clearColor = {{{0.0f, 0.0f, 0.0f, 1.0f}}};   // nền đen

    VkRenderPassBeginInfo passInfo{};
    passInfo.sType = VK_STRUCTURE_TYPE_RENDER_PASS_BEGIN_INFO;
    passInfo.renderPass = renderPass;
    passInfo.framebuffer = framebuffers[imageIndex];
    passInfo.renderArea.offset = {0, 0};
    passInfo.renderArea.extent = swapchainExtent;
    passInfo.clearValueCount = 1;
    passInfo.pClearValues = &clearColor;

    vkCmdBeginRenderPass(cmd, &passInfo, VK_SUBPASS_CONTENTS_INLINE);
    vkCmdBindPipeline(cmd, VK_PIPELINE_BIND_POINT_GRAPHICS, graphicsPipeline);

    VkViewport viewport{};
    viewport.width = static_cast<float>(swapchainExtent.width);
    viewport.height = static_cast<float>(swapchainExtent.height);
    viewport.maxDepth = 1.0f;
    vkCmdSetViewport(cmd, 0, 1, &viewport);

    VkRect2D scissor{{0, 0}, swapchainExtent};
    vkCmdSetScissor(cmd, 0, 1, &scissor);

    vkCmdDraw(cmd, 3, 1, 0, 0);   // 3 đỉnh, 1 instance → MỘT TAM GIÁC

    vkCmdEndRenderPass(cmd);
    check(vkEndCommandBuffer(cmd), "vkEndCommandBuffer");
}`,
    cleanup: String.raw`vkDestroyCommandPool(device, commandPool, nullptr);   // giải phóng luôn command buffer`,
    call: "createCommandBuffer();",
    notes: [
      { h: "Tạo một lần, ghi nhiều lần", t: "Khối này nằm trong phần khởi tạo. Còn recordCommandBuffer được drawFrame gọi lại mỗi frame, vì mỗi frame vẽ vào một framebuffer khác." },
      { h: "Hàm vkCmd*", t: "Mọi hàm bắt đầu bằng vkCmd chỉ ghi lệnh vào buffer, không làm gì ngay. GPU chỉ chạy khi buffer được submit." },
      { h: "vkCmdDraw(cmd, 3, 1, 0, 0)", t: "Tham số: số đỉnh = 3, số instance = 1, đỉnh bắt đầu = 0, instance bắt đầu = 0. Vertex shader chạy 3 lần với gl_VertexIndex = 0, 1, 2." },
      { h: "Dùng biến của khối khác", t: "recordCommandBuffer dùng renderPass, framebuffers, graphicsPipeline. Lúc tạo pool thì chưa cần chúng, nhưng lúc drawFrame chạy thì phải có hết." },
    ],
    pitfalls: ["Quên flag RESET_COMMAND_BUFFER_BIT, không ghi lại buffer được.", "Gọi vkCmdDraw ngoài vkCmdBeginRenderPass/EndRenderPass."],
  },
  {
    id: "sync", phase: 4, title: "Đồng bộ", fn: "createSyncObjects",
    short: "Tạo semaphore và fence",
    analogy: "Đèn tín hiệu trong xưởng. Đèn “toan đã trống”, đèn “vẽ xong, được treo”. Còn chuông (fence) báo cho bạn biết họa sĩ đã xong việc lần trước.",
    needs: ["device", "swapchain"], provides: ["sync"],
    log: "vkCreateSemaphore ×4, vkCreateFence (SIGNALED) → VK_SUCCESS",
    why: "CPU và GPU chạy song song và không chờ nhau. Semaphore để các việc trên GPU đợi nhau: vẽ đợi swapchain trả ảnh (imageAvailable), present đợi vẽ xong (renderFinished). Fence để CPU đợi GPU vẽ xong frame trước rồi mới ghi đè command buffer.",
    globals: String.raw`VkSemaphore imageAvailable = VK_NULL_HANDLE;
std::vector<VkSemaphore> renderFinished;   // mỗi ảnh swapchain một cái
VkFence inFlight = VK_NULL_HANDLE;`,
    code: String.raw`void createSyncObjects() {
    VkSemaphoreCreateInfo semInfo{};
    semInfo.sType = VK_STRUCTURE_TYPE_SEMAPHORE_CREATE_INFO;

    VkFenceCreateInfo fenceInfo{};
    fenceInfo.sType = VK_STRUCTURE_TYPE_FENCE_CREATE_INFO;
    fenceInfo.flags = VK_FENCE_CREATE_SIGNALED_BIT;   // frame đầu tiên không có gì để chờ

    check(vkCreateSemaphore(device, &semInfo, nullptr, &imageAvailable), "vkCreateSemaphore");

    renderFinished.resize(swapchainImages.size());
    for (VkSemaphore& s : renderFinished)
        check(vkCreateSemaphore(device, &semInfo, nullptr, &s), "vkCreateSemaphore");

    check(vkCreateFence(device, &fenceInfo, nullptr, &inFlight), "vkCreateFence");
}`,
    cleanup: String.raw`vkDestroyFence(device, inFlight, nullptr);
for (VkSemaphore s : renderFinished)
    vkDestroySemaphore(device, s, nullptr);
vkDestroySemaphore(device, imageAvailable, nullptr);`,
    call: "createSyncObjects();",
    notes: [
      { h: "Semaphore và fence", t: "Semaphore: GPU chờ GPU, CPU không nhìn thấy. Fence: CPU chờ GPU, dùng vkWaitForFences." },
      { h: "Vì sao fence SIGNALED", t: "drawFrame bắt đầu bằng việc chờ fence. Ở frame đầu chưa có gì chạy, nếu fence chưa bật thì chương trình chờ mãi." },
      { h: "renderFinished theo từng ảnh", t: "Present có thể chưa dùng xong semaphore khi frame sau bắt đầu. Dùng một semaphore cho mỗi ảnh swapchain (chọn theo imageIndex) để không tái sử dụng khi nó còn bận. Vì vậy khối này cần Swapchain có trước." },
    ],
    pitfalls: ["Tạo fence không có SIGNALED_BIT, chương trình treo ngay frame đầu.", "Dùng chung một renderFinished cho mọi ảnh, validation layer mới báo lỗi tái sử dụng semaphore."],
  },
  {
    id: "sync_unsignaled", phase: 4, title: "Đồng bộ (mặc định)", fn: "createSyncObjects",
    short: "Tạo semaphore và fence với cấu hình mặc định",
    trap: true, fixId: "sync",
    analogy: "Bạn đặt luật “chờ chuông báo xong việc cũ rồi mới giao việc mới”, nhưng chưa từng giao việc nào nên chuông không bao giờ reo. Bạn đứng chờ mãi.",
    needs: ["device", "swapchain"], provides: ["sync"],
    log: "vkCreateSemaphore ×4, vkCreateFence → VK_SUCCESS",
    why: "Giống hệt khối Đồng bộ nhưng thiếu flags = VK_FENCE_CREATE_SIGNALED_BIT. Mọi lệnh tạo đều thành công. Lỗi chỉ lộ ra ở frame đầu tiên: drawFrame gọi vkWaitForFences với thời gian chờ vô hạn, mà fence chưa bao giờ được bật.",
    globals: String.raw`VkSemaphore imageAvailable = VK_NULL_HANDLE;
std::vector<VkSemaphore> renderFinished;
VkFence inFlight = VK_NULL_HANDLE;`,
    code: String.raw`void createSyncObjects() {
    VkSemaphoreCreateInfo semInfo{};
    semInfo.sType = VK_STRUCTURE_TYPE_SEMAPHORE_CREATE_INFO;

    VkFenceCreateInfo fenceInfo{};
    fenceInfo.sType = VK_STRUCTURE_TYPE_FENCE_CREATE_INFO;
    // ✗ THIẾU: fenceInfo.flags = VK_FENCE_CREATE_SIGNALED_BIT;

    check(vkCreateSemaphore(device, &semInfo, nullptr, &imageAvailable), "vkCreateSemaphore");
    renderFinished.resize(swapchainImages.size());
    for (VkSemaphore& s : renderFinished)
        check(vkCreateSemaphore(device, &semInfo, nullptr, &s), "vkCreateSemaphore");
    check(vkCreateFence(device, &fenceInfo, nullptr, &inFlight), "vkCreateFence");
}`,
    cleanup: String.raw`vkDestroyFence(device, inFlight, nullptr);
for (VkSemaphore s : renderFinished)
    vkDestroySemaphore(device, s, nullptr);
vkDestroySemaphore(device, imageAvailable, nullptr);`,
    call: "createSyncObjects();",
    effect: { at: "drawFrame", kind: "hang", code: "vkWaitForFences(..., UINT64_MAX) không bao giờ trả về",
      msg: "Chương trình treo ngay frame đầu: drawFrame chờ fence inFlight, nhưng fence được tạo ở trạng thái chưa bật và chưa có lệnh submit nào để bật nó. Cửa sổ đen, macOS hiện con trỏ cầu vồng." },
    notes: [
      { h: "Lỗi không có thông báo", t: "Đây là loại lỗi khó tìm: không có VkResult lỗi, validation layer cũng không báo. Chương trình chỉ đứng im." },
      { h: "Cách sửa", t: "Tạo fence với flags = VK_FENCE_CREATE_SIGNALED_BIT." },
    ],
    pitfalls: [],
  },
  {
    id: "vertexbuffer", phase: 3, title: "Vertex buffer", fn: "createVertexBuffer",
    short: "Đưa toạ độ 3 đỉnh lên bộ nhớ GPU",
    trap: true, fixId: null,
    analogy: "Thuê thêm một kho chứa vật liệu, trong khi công thức đã ghi sẵn toạ độ 3 điểm. Kho xây xong nhưng không ai dùng.",
    needs: ["device"], provides: ["vertexbuffer"],
    log: "vkCreateBuffer + vkAllocateMemory + vkBindBufferMemory → VK_SUCCESS",
    why: "Vertex buffer là cách thông thường để đưa dữ liệu đỉnh lên GPU, và bạn sẽ cần nó khi vẽ mô hình thật. Nhưng ở bản tam giác này, 3 đỉnh đã viết cứng trong vertex shader, pipeline cũng khai báo đầu vào đỉnh trống. Buffer tạo ra không được dùng. Tam giác vẫn hiện, nhưng thêm khoảng 60 dòng code thừa.",
    globals: String.raw`VkBuffer vertexBuffer = VK_NULL_HANDLE;
VkDeviceMemory vertexMemory = VK_NULL_HANDLE;`,
    code: String.raw`void createVertexBuffer() {
    // Toạ độ 3 đỉnh, trùng với positions[] trong vertex shader → thừa
    float vertices[] = { 0.0f, -0.5f,   0.5f, 0.5f,   -0.5f, 0.5f };

    VkBufferCreateInfo bufferInfo{};
    bufferInfo.sType = VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO;
    bufferInfo.size = sizeof(vertices);
    bufferInfo.usage = VK_BUFFER_USAGE_VERTEX_BUFFER_BIT;
    bufferInfo.sharingMode = VK_SHARING_MODE_EXCLUSIVE;
    check(vkCreateBuffer(device, &bufferInfo, nullptr, &vertexBuffer), "vkCreateBuffer");

    // Tìm loại bộ nhớ CPU ghi được (HOST_VISIBLE | HOST_COHERENT)
    VkMemoryRequirements req;
    vkGetBufferMemoryRequirements(device, vertexBuffer, &req);
    VkPhysicalDeviceMemoryProperties memProps;
    vkGetPhysicalDeviceMemoryProperties(physicalDevice, &memProps);
    uint32_t typeIndex = UINT32_MAX;
    VkMemoryPropertyFlags want = VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT;
    for (uint32_t i = 0; i < memProps.memoryTypeCount; i++)
        if ((req.memoryTypeBits & (1u << i)) && (memProps.memoryTypes[i].propertyFlags & want) == want) {
            typeIndex = i;
            break;
        }

    VkMemoryAllocateInfo allocInfo{};
    allocInfo.sType = VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_INFO;
    allocInfo.allocationSize = req.size;
    allocInfo.memoryTypeIndex = typeIndex;
    check(vkAllocateMemory(device, &allocInfo, nullptr, &vertexMemory), "vkAllocateMemory");
    vkBindBufferMemory(device, vertexBuffer, vertexMemory, 0);

    void* data;
    vkMapMemory(device, vertexMemory, 0, sizeof(vertices), 0, &data);
    std::memcpy(data, vertices, sizeof(vertices));
    vkUnmapMemory(device, vertexMemory);
    // Muốn dùng thật còn phải: khai báo vertex input trong pipeline,
    // sửa shader dùng layout(location = 0) in vec2, và gọi vkCmdBindVertexBuffers.
}`,
    cleanup: String.raw`vkDestroyBuffer(device, vertexBuffer, nullptr);
vkFreeMemory(device, vertexMemory, nullptr);`,
    call: "createVertexBuffer();",
    effect: { at: "end", kind: "warn", code: "Không lỗi, nhưng thừa",
      msg: "Tam giác vẫn hiện, nhưng khối Vertex buffer không được dùng: đỉnh đã viết cứng trong vertex shader và pipeline không khai báo vertex input. Bỏ khối này ra để code gọn." },
    notes: [
      { h: "Khi nào cần", t: "Khi đỉnh đến từ dữ liệu bên ngoài (file mô hình, dữ liệu sinh lúc chạy), hoặc có nhiều đỉnh. Đây sẽ là bước học tiếp theo sau tam giác cơ bản." },
      { h: "Bộ nhớ trong Vulkan", t: "Vulkan bắt ta tự chọn loại bộ nhớ và tự cấp phát. Đây là một trong những phần khó nhất, nên bản đầu tiên tránh nó." },
    ],
    pitfalls: [],
  },
  // ───────────────────────── VÒNG LẶP ─────────────────────────
  {
    id: "drawFrame", phase: 4, title: "drawFrame()", fn: "drawFrame",
    short: "Vẽ một frame: Acquire, Submit, Present",
    analogy: "Mỗi lượt: chờ chuông → xin một tấm toan trống → bỏ phiếu việc vào khay → khi đèn “vẽ xong” bật, treo tranh lên tường.",
    needs: ["swapchain", "pipeline", "framebuffers", "commands", "sync"], provides: [],
    loopOnly: true,
    log: "drawFrame: acquire → submit → present → tam giác hiện!",
    why: "Hàm duy nhất chạy mỗi frame. Nó dùng gần như mọi thứ đã tạo: swapchain, command buffer (qua recordCommandBuffer), pipeline, framebuffers, semaphore và fence. Phải đặt trong vòng lặp while, nếu không sẽ chỉ vẽ một lần.",
    globals: "",
    code: String.raw`void drawFrame() {
    // 0) Chờ GPU vẽ xong frame trước (chuông fence), vì ta sắp ghi đè commandBuffer
    vkWaitForFences(device, 1, &inFlight, VK_TRUE, UINT64_MAX);

    // 1) ACQUIRE: xin swapchain một ảnh trống. imageAvailable sẽ bật khi ảnh thật sự rảnh.
    uint32_t imageIndex;
    VkResult result = vkAcquireNextImageKHR(device, swapchain, UINT64_MAX,
                                            imageAvailable, VK_NULL_HANDLE, &imageIndex);
    if (result != VK_SUCCESS && result != VK_SUBOPTIMAL_KHR)
        check(result, "vkAcquireNextImageKHR");
    vkResetFences(device, 1, &inFlight);

    // Ghi lại phiếu việc cho ảnh số imageIndex
    vkResetCommandBuffer(commandBuffer, 0);
    recordCommandBuffer(commandBuffer, imageIndex);

    // 2) SUBMIT: gửi phiếu lên GPU. Đợi imageAvailable, xong thì bật renderFinished và fence.
    VkPipelineStageFlags waitStage = VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT;
    VkSubmitInfo submitInfo{};
    submitInfo.sType = VK_STRUCTURE_TYPE_SUBMIT_INFO;
    submitInfo.waitSemaphoreCount = 1;
    submitInfo.pWaitSemaphores = &imageAvailable;
    submitInfo.pWaitDstStageMask = &waitStage;
    submitInfo.commandBufferCount = 1;
    submitInfo.pCommandBuffers = &commandBuffer;
    submitInfo.signalSemaphoreCount = 1;
    submitInfo.pSignalSemaphores = &renderFinished[imageIndex];
    check(vkQueueSubmit(graphicsQueue, 1, &submitInfo, inFlight), "vkQueueSubmit");

    // 3) PRESENT: khi renderFinished bật, đưa ảnh lên màn hình
    VkPresentInfoKHR presentInfo{};
    presentInfo.sType = VK_STRUCTURE_TYPE_PRESENT_INFO_KHR;
    presentInfo.waitSemaphoreCount = 1;
    presentInfo.pWaitSemaphores = &renderFinished[imageIndex];
    presentInfo.swapchainCount = 1;
    presentInfo.pSwapchains = &swapchain;
    presentInfo.pImageIndices = &imageIndex;
    result = vkQueuePresentKHR(presentQueue, &presentInfo);
    if (result != VK_SUCCESS && result != VK_SUBOPTIMAL_KHR)
        check(result, "vkQueuePresentKHR");
}`,
    cleanup: "",
    call: "drawFrame();",
    notes: [
      { h: "Thứ tự trong một frame", t: "CPU: chờ fence → acquire → reset fence → ghi lệnh → submit → present. Hai semaphore nối các bước trên GPU thành chuỗi: ảnh rảnh → vẽ → hiển thị." },
      { h: "Reset fence sau acquire", t: "Nếu acquire lỗi mà ta đã reset fence, lần sau vkWaitForFences sẽ chờ mãi. Reset sau acquire tránh được chuyện đó." },
      { h: "VK_SUBOPTIMAL_KHR", t: "Swapchain vẫn dùng được nhưng không còn khớp hoàn toàn với surface (ví dụ cửa sổ vừa chuyển màn hình). Bản đầu coi như thành công." },
      { h: "Chỉ 1 frame in flight", t: "Bản này chỉ cho GPU giữ 1 frame. Bản tối ưu hơn dùng 2 frame in flight (2 bộ command buffer, semaphore, fence) để CPU và GPU chồng việc lên nhau." },
      { h: "Sau vòng lặp", t: "main() gọi vkDeviceWaitIdle(device) trước cleanup(), để GPU làm xong hết việc rồi mới hủy đối tượng." },
    ],
    pitfalls: ["Đặt drawFrame ngoài vòng lặp, chỉ vẽ một lần.", "Quên vkDeviceWaitIdle trước cleanup, validation báo hủy đối tượng đang dùng."],
  },
];

window.BY_ID = Object.fromEntries(window.BLOCKS.map((b) => [b.id, b]));

// Một thứ tự đúng (dùng cho nút "Điền đáp án mẫu" và nút trước/sau ở trang khối)
window.CANONICAL = ["window", "instance", "surface", "physical", "device", "swapchain", "views",
  "renderpass", "shaders", "pipeline", "framebuffers", "commands", "sync"];
window.CANONICAL_LOOP = ["drawFrame"];

// Ghép main.cpp từ thứ tự khối trong phần khởi tạo
window.assembleMain = function (initIds) {
  const blocks = initIds.map((id) => window.BY_ID[id]);
  const draw = window.BY_ID.drawFrame;
  const all = [...blocks, draw];
  const indent = (s, n) => s.split("\n").map((l) => (l ? " ".repeat(n) + l : l)).join("\n");
  const parts = [window.HEADER_CODE, "", "// ════════════ Biến toàn cục ════════════"];
  all.forEach((b) => { if (b.globals) parts.push(`\n// ${b.title}\n${b.globals}`); });
  parts.push("", "// ════════════ Các bước ════════════");
  all.forEach((b) => parts.push(`\n// ── ${b.title} ──\n${b.code}`));
  parts.push("", "// ════════════ Dọn dẹp: hủy theo thứ tự ngược lúc tạo ════════════", "void cleanup() {");
  [...blocks].reverse().forEach((b) => { if (b.cleanup) parts.push(indent(b.cleanup, 4)); });
  parts.push("}", "", "int main() {", "    try {");
  blocks.forEach((b) => parts.push("        " + b.call));
  parts.push(
    "",
    "        while (!glfwWindowShouldClose(window)) {",
    "            glfwPollEvents();",
    "            drawFrame();",
    "        }",
    "        vkDeviceWaitIdle(device);   // đợi GPU xong hết việc",
    "        cleanup();",
    "    } catch (const std::exception& e) {",
    "        std::cerr << \"Lỗi: \" << e.what() << \"\\n\";",
    "        return 1;",
    "    }",
    "    return 0;",
    "}",
    ""
  );
  return parts.join("\n");
};

// Tô màu cú pháp C++/GLSL/shell đơn giản (không cần thư viện ngoài)
window.highlight = function (src, lang = "cpp") {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const kw = /^(void|bool|int|float|char|const|auto|for|if|else|return|while|try|catch|throw|static_cast|reinterpret_cast|size_t|uint32_t|uint64_t|true|false|nullptr|struct|layout|in|out|vec2|vec3|vec4|break|continue|std|set|export)$/;
  const re = lang === "sh"
    ? /(#[^\n]*)|("(?:[^"\\]|\\.)*")|(\b[\w./-]+\b)/g
    : /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*")|(#\s*\w+)|(\b\d+(?:\.\d+)?f?\b)|(\b[A-Za-z_]\w*\b)/g;
  let out = "", last = 0, m;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    const t = m[0], e = esc(t);
    if (lang === "sh") {
      if (m[1]) out += `<span class="tk-com">${e}</span>`;
      else if (m[2]) out += `<span class="tk-str">${e}</span>`;
      else if (/^(brew|glslangValidator|clang\+\+|mkdir|export|set)$/.test(t)) out += `<span class="tk-fn">${e}</span>`;
      else out += e;
    } else if (m[1]) out += `<span class="tk-com${t.includes("✗") ? " tk-bad" : ""}">${e}</span>`;
    else if (m[2]) out += `<span class="tk-str">${e}</span>`;
    else if (m[3]) out += `<span class="tk-pre">${e}</span>`;
    else if (m[4]) out += `<span class="tk-num">${e}</span>`;
    else if (/^(vk|glfw)[A-Z]/.test(t) || /^(vkCmd)/.test(t)) out += `<span class="tk-fn">${e}</span>`;
    else if (/^Vk[A-Z]/.test(t) || /^GLFW[a-z]/.test(t)) out += `<span class="tk-type">${e}</span>`;
    else if (/^(VK|GLFW)_[A-Z0-9_]+$/.test(t)) out += `<span class="tk-const">${e}</span>`;
    else if (kw.test(t)) out += `<span class="tk-kw">${e}</span>`;
    else out += e;
    last = re.lastIndex;
  }
  return out + esc(src.slice(last));
};
