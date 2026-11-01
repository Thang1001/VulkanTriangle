// main.cpp — Basic Triangle (Vulkan + GLFW, C++17)
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
}

// ════════════ Biến toàn cục ════════════

// Window
GLFWwindow* thangduongWindow = nullptr;

// Instance
VkInstance thangduongInstance = VK_NULL_HANDLE;
// only this layer, standard or this unified layer you need to care now
// check the driver support this layer or not ???
const std::vector<const char*> thangduongValidationLayers = {"VK_LAYER_KHRONOS_validation"};

// Surface
// VkSurfaceKHR surface = VK_NULL_HANDLE;
VkSurfaceKHR thangduongSurface = nullptr;

// Physical device
// VkPhysicalDevice physicalDevice = VK_NULL_HANDLE;
// uint32_t graphicsFamily = UINT32_MAX;
// uint32_t presentFamily = UINT32_MAX;

// Physical device -> VkPhysicalDevice
VkPhysicalDevice thangduongPhysicalDevice = nullptr;
uint32_t thangduongGraphicFamily = UINT32_MAX;
uint32_t thangduongPresentFamily = UINT32_MAX;

// Logical device -> VkDevice
// Logical device + Queue
// VkDevice device = VK_NULL_HANDLE;
// VkQueue graphicsQueue = VK_NULL_HANDLE;
// VkQueue presentQueue = VK_NULL_HANDLE;
VkDevice thangduongLogicalDevice = nullptr;
VkQueue thangduongGraphicQueue = nullptr;
VkQueue thangduongPresentQueue = nullptr;

// Swapchain
VkSwapchainKHR thangduongSwapChain = VK_NULL_HANDLE;
std::vector<VkImage> thangduongSwapchainImages;
VkFormat thangduongSwapchainFormat = VK_FORMAT_UNDEFINED;
VkExtent2D thangduongSwapchainExtent{};

// Image views
std::vector<VkImageView> thangduongSwapchainImageViews;

// Render pass
VkRenderPass thangduongRenderPass = VK_NULL_HANDLE;

// Shaders
VkShaderModule thangduongVertShader = VK_NULL_HANDLE;
VkShaderModule thangduongFragShader = VK_NULL_HANDLE;

// Graphics pipeline
VkPipelineLayout thangduongPipelineLayout = VK_NULL_HANDLE;
VkPipeline thangduongGraphicsPipeline = VK_NULL_HANDLE;

// Framebuffers
std::vector<VkFramebuffer> thangduongFramebuffers;

// Command pool + buffer
VkCommandPool thangduongCommandPool = VK_NULL_HANDLE;
VkCommandBuffer thangduongCommandBuffer = VK_NULL_HANDLE;

// Đồng bộ
VkSemaphore thangduongImageAvailable = VK_NULL_HANDLE;
std::vector<VkSemaphore> thangduongRenderFinished;   // mỗi ảnh swapchain một cái
VkFence thangduongInFlight = VK_NULL_HANDLE;

// ════════════ Các bước ════════════
// Init window
// glfwCreateWindow
void thangduongInitWindow()
{
    glfwInit();

    // disable OpenGL context because we are running with Vulkan
    glfwWindowHint(GLFW_CLIENT_API, GLFW_NO_API);
    
    // no resize, we dont want to recreate swapchain with this version
    glfwWindowHint(GLFW_RESIZABLE, GLFW_FALSE);

    thangduongWindow = glfwCreateWindow(WIDTH / 2, HEIGHT / 3, "Thang Duong Triangle", nullptr, nullptr);
}

// ── Instance ── checkValidationLayersAvailable
bool thangduongValidationLayersAvailable()
{
    uint32_t count = 0;
    vkEnumerateInstanceLayerProperties(&count, nullptr); // count the validation layer available
    std::vector<VkLayerProperties> layers;
    vkEnumerateInstanceLayerProperties(&count, layers.data()); // get the layers properties to the vector
    for (const auto& layer : layers)
    {
        if(std::strcmp(layer.layerName, thangduongValidationLayers[0]) == 0)
        {
            return true;
        }
    }

    return false;
}

// vkCreateInstance
void thangduongCreateInstance()
{
    // create app info
    VkApplicationInfo thangduongAppInfo{};
    thangduongAppInfo.sType = VK_STRUCTURE_TYPE_APPLICATION_INFO;
    thangduongAppInfo.pNext = nullptr;
    thangduongAppInfo.pApplicationName = "Thang Duong Triangle";
    thangduongAppInfo.applicationVersion = VK_MAKE_VERSION(1,3,0);
    thangduongAppInfo.pEngineName = "Thang Duong Pure";
    thangduongAppInfo.engineVersion = VK_MAKE_VERSION(1,4,0);
    thangduongAppInfo.apiVersion = VK_API_VERSION_1_4;

    // extension GLFW can thiet to connect VK vs window (surface, ...)
    uint32_t glfwCount = 0;
    const char** glfwExtentions = glfwGetRequiredInstanceExtensions(&glfwCount);
    std::vector<const char*> thangduongGLFWInstanceExtensions(glfwExtentions, glfwExtentions + glfwCount);
    
    VkInstanceCreateInfo thangduongCreateInfo{};
    thangduongCreateInfo.sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO; // structure type
    thangduongCreateInfo.pNext = nullptr;

#ifdef __APPLE__
    // moltenVK
    thangduongGLFWInstanceExtensions.push_back(VK_KHR_PORTABILITY_ENUMERATION_EXTENSION_NAME);
    thangduongCreateInfo.flags |= VK_INSTANCE_CREATE_ENUMERATE_PORTABILITY_BIT_KHR;
#endif

    thangduongCreateInfo.pApplicationInfo = &thangduongAppInfo;

    if(enableValidation && thangduongValidationLayersAvailable())
    {
        thangduongCreateInfo.enabledLayerCount = static_cast<uint32_t>(sizeof(thangduongValidationLayers.size()));
        thangduongCreateInfo.ppEnabledLayerNames = thangduongValidationLayers.data();
    }

    thangduongCreateInfo.enabledExtensionCount = static_cast<uint32_t>(thangduongGLFWInstanceExtensions.size());
    thangduongCreateInfo.ppEnabledExtensionNames = thangduongGLFWInstanceExtensions.data();


    // local Instance Creation Info: thangduongCreateInfo
    // global instance: thangduongInstance

    // check function parameters:
    // 1: function result 
    // 2: function name
    check(vkCreateInstance(&thangduongCreateInfo, nullptr, &thangduongInstance), "vkCreateInstance");
}

// ── Surface ── glfwCreateWindowSurface
void thangduongCreateSurface()
{
    check(glfwCreateWindowSurface(thangduongInstance, thangduongWindow, nullptr, &thangduongSurface), "glfwCreateWindowSurface");
}

bool thangduongCheckPhysicalDeviceExtension(VkPhysicalDevice dev, const char* name)
{
    uint32_t thangduongCount = 0;
    vkEnumerateDeviceExtensionProperties(dev, nullptr, &thangduongCount, nullptr);

    if(!thangduongCount)
    {
        throw std::runtime_error("[STATUS] Failed! There is no device extension\n");
    }

    std::vector<VkExtensionProperties> localThangDuongExtensionProperties{thangduongCount};
    vkEnumerateDeviceExtensionProperties(dev, nullptr, &thangduongCount, localThangDuongExtensionProperties.data());

    for(const auto& extensionProperty : localThangDuongExtensionProperties)
    {
        if(std::strcmp(extensionProperty.extensionName, name))
        {
            return true;
        }
    }
    return false;
}

// thang duong Physical Device
void thangduongPickPhysicalDevice()
{
    uint32_t thangduongPhyCount = 0;
    vkEnumeratePhysicalDevices(thangduongInstance, &thangduongPhyCount, nullptr); // no physical device selected yet

    if(!thangduongPhyCount)
    {
        throw std::runtime_error("[STATUS] Failed! No GPU support VK\n");
    }

    std::vector<VkPhysicalDevice> localThangDuongPhysicalDevice{thangduongPhyCount};
    vkEnumeratePhysicalDevices(thangduongInstance, &thangduongPhyCount, localThangDuongPhysicalDevice.data());
    
    // start checking what we want
    for(VkPhysicalDevice localThangDuongDev : localThangDuongPhysicalDevice)
    {
        // check swapchain
        if(!thangduongCheckPhysicalDeviceExtension(localThangDuongDev, VK_KHR_SWAPCHAIN_EXTENSION_NAME)) // or VK_KHR_SWAPCHAIN_EXTENSION_NAME
        {
            continue;
        }

        // familyCount
        uint32_t localThangDuongQueueFamilyCount = 0;
        vkGetPhysicalDeviceQueueFamilyProperties(localThangDuongDev, &localThangDuongQueueFamilyCount, nullptr); // get number first
        if(!localThangDuongQueueFamilyCount)
        {
            throw std::runtime_error("[STATUS] Failed! No queue family\n");
        }
        std::vector<VkQueueFamilyProperties> localThangDuongQueueFamilyProperty{localThangDuongQueueFamilyCount};
        vkGetPhysicalDeviceQueueFamilyProperties(localThangDuongDev, &localThangDuongQueueFamilyCount, localThangDuongQueueFamilyProperty.data());

        uint32_t localThangDuongGraphicQueue = UINT32_MAX;
        uint32_t localThangDuongPresentQueue = UINT32_MAX;;

        for(uint32_t i=0; i<localThangDuongQueueFamilyCount; i++)
        {
            // check graphic queue and present queue
            if(localThangDuongGraphicQueue == UINT32_MAX && localThangDuongQueueFamilyProperty[i].queueFlags & VK_QUEUE_GRAPHICS_BIT)
            {
                localThangDuongGraphicQueue = i;
            }

            VkBool32 isPresentable = false;
            vkGetPhysicalDeviceSurfaceSupportKHR(localThangDuongDev, i, thangduongSurface, &isPresentable);
            if(isPresentable)
            {
                localThangDuongPresentQueue = i;
            }
        }

        if(localThangDuongPresentQueue != UINT32_MAX && localThangDuongGraphicQueue != UINT32_MAX)
        {
            thangduongPhysicalDevice = localThangDuongDev;
            thangduongGraphicFamily = localThangDuongGraphicQueue;
            thangduongPresentFamily = localThangDuongPresentQueue;
        }

        VkPhysicalDeviceProperties localThangDuongPhysicalDeviceProperties;
        vkGetPhysicalDeviceProperties(thangduongPhysicalDevice, &localThangDuongPhysicalDeviceProperties);
        std::cout << "select GPU: " << localThangDuongPhysicalDeviceProperties.deviceName << std::endl;
        return;
    }
    throw std::runtime_error("[STATUS] Failed! No GPU OK to be select\n");
}

// Logical device + queue
void thangduongCreateLogicalDevice()
{
    // get queue from needed family
    std::vector<uint32_t> thangduongFamilies = {thangduongGraphicFamily}; // family da co Graphic Family
    if(thangduongPresentFamily != thangduongGraphicFamily) // phong truong hop duplicate queue
    {
        thangduongFamilies.push_back(thangduongPresentFamily); // neu Present va Graphic ko cung 1 queue -> push back vao, ko thi giu queue kia dung chung
    }

    float thangduongQueuePriority = 1.0f;
    std::vector<VkDeviceQueueCreateInfo> localThangDuongDeviceQueueCreateInfo;
    for(uint32_t family : thangduongFamilies)
    {
        VkDeviceQueueCreateInfo localThangDuongQueueInfo;
        localThangDuongQueueInfo.sType = VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO;
        localThangDuongQueueInfo.queueFamilyIndex = family;
        localThangDuongQueueInfo.queueCount = 1;
        localThangDuongQueueInfo.pQueuePriorities = &thangduongQueuePriority;
        localThangDuongDeviceQueueCreateInfo.push_back(localThangDuongQueueInfo);
    }

    std::vector<const char*> thangduongExtensions = {VK_KHR_SWAPCHAIN_EXTENSION_NAME};
    if(thangduongCheckPhysicalDeviceExtension(thangduongPhysicalDevice, "VK_KHR_portability_subset"))
    {
        thangduongExtensions.push_back("VK_KHR_portability_subset");
    }

    VkPhysicalDeviceFeatures localThangDuongPhysicalDeviceFeature{};

    VkDeviceCreateInfo thangduongLogicalDeviceCreateInfo{};
    thangduongLogicalDeviceCreateInfo.sType = VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO;
    thangduongLogicalDeviceCreateInfo.pNext = nullptr;
    thangduongLogicalDeviceCreateInfo.queueCreateInfoCount = localThangDuongDeviceQueueCreateInfo.size();
    thangduongLogicalDeviceCreateInfo.pQueueCreateInfos = localThangDuongDeviceQueueCreateInfo.data();
    thangduongLogicalDeviceCreateInfo.enabledLayerCount = 0;
    thangduongLogicalDeviceCreateInfo.ppEnabledLayerNames = nullptr;
    thangduongLogicalDeviceCreateInfo.enabledExtensionCount = thangduongExtensions.size();
    thangduongLogicalDeviceCreateInfo.ppEnabledExtensionNames = thangduongExtensions.data();
    thangduongLogicalDeviceCreateInfo.pEnabledFeatures = &localThangDuongPhysicalDeviceFeature;

    check(vkCreateDevice(thangduongPhysicalDevice, &thangduongLogicalDeviceCreateInfo, nullptr, &thangduongLogicalDevice), "vkCreateDevice");
    vkGetDeviceQueue(thangduongLogicalDevice, thangduongGraphicFamily, 0, &thangduongGraphicQueue); // get graphic queue
    vkGetDeviceQueue(thangduongLogicalDevice, thangduongPresentFamily, 0, &thangduongPresentQueue); // get present queue
}

// ── Swapchain ──
void createSwapchain() {
    VkSurfaceCapabilitiesKHR caps;
    vkGetPhysicalDeviceSurfaceCapabilitiesKHR(thangduongPhysicalDevice, thangduongSurface, &caps);

    // 1) Định dạng màu: ưu tiên BGRA 8-bit sRGB, không có thì lấy cái đầu tiên
    uint32_t formatCount = 0;
    vkGetPhysicalDeviceSurfaceFormatsKHR(thangduongPhysicalDevice, thangduongSurface, &formatCount, nullptr);
    std::vector<VkSurfaceFormatKHR> formats(formatCount);
    vkGetPhysicalDeviceSurfaceFormatsKHR(thangduongPhysicalDevice, thangduongSurface, &formatCount, formats.data());
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
        glfwGetFramebufferSize(thangduongWindow, &w, &h);
        extent.width  = std::clamp(static_cast<uint32_t>(w), caps.minImageExtent.width,  caps.maxImageExtent.width);
        extent.height = std::clamp(static_cast<uint32_t>(h), caps.minImageExtent.height, caps.maxImageExtent.height);
    }

    // Xin nhiều hơn mức tối thiểu 1 ảnh để GPU ít phải chờ
    uint32_t imageCount = caps.minImageCount + 1;
    if (caps.maxImageCount > 0 && imageCount > caps.maxImageCount)
        imageCount = caps.maxImageCount;

    VkSwapchainCreateInfoKHR createInfo{};
    createInfo.sType = VK_STRUCTURE_TYPE_SWAPCHAIN_CREATE_INFO_KHR;
    createInfo.surface = thangduongSurface;
    createInfo.minImageCount = imageCount;
    createInfo.imageFormat = chosen.format;
    createInfo.imageColorSpace = chosen.colorSpace;
    createInfo.imageExtent = extent;
    createInfo.imageArrayLayers = 1;
    createInfo.imageUsage = VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT;   // dùng làm chỗ vẽ màu

    uint32_t familyIndices[] = {thangduongGraphicFamily, thangduongPresentFamily};
    if (thangduongGraphicFamily != thangduongPresentFamily) {
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

    check(vkCreateSwapchainKHR(thangduongLogicalDevice, &createInfo, nullptr, &thangduongSwapChain), "vkCreateSwapchainKHR");

    vkGetSwapchainImagesKHR(thangduongLogicalDevice, thangduongSwapChain, &imageCount, nullptr);
    thangduongSwapchainImages.resize(imageCount);
    vkGetSwapchainImagesKHR(thangduongLogicalDevice, thangduongSwapChain, &imageCount, thangduongSwapchainImages.data());

    thangduongSwapchainFormat = chosen.format;
    thangduongSwapchainExtent = extent;
}

// ── Image views ──
void createImageViews() {
    thangduongSwapchainImageViews.resize(thangduongSwapchainImages.size());

    for (size_t i = 0; i < thangduongSwapchainImages.size(); i++) {
        VkImageViewCreateInfo createInfo{};
        createInfo.sType = VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO;
        createInfo.image = thangduongSwapchainImages[i];
        createInfo.viewType = VK_IMAGE_VIEW_TYPE_2D;
        createInfo.format = thangduongSwapchainFormat;
        // components để mặc định = IDENTITY: giữ nguyên các kênh R, G, B, A

        // Dùng phần màu, 1 mip level, 1 layer
        createInfo.subresourceRange.aspectMask = VK_IMAGE_ASPECT_COLOR_BIT;
        createInfo.subresourceRange.baseMipLevel = 0;
        createInfo.subresourceRange.levelCount = 1;
        createInfo.subresourceRange.baseArrayLayer = 0;
        createInfo.subresourceRange.layerCount = 1;

        check(vkCreateImageView(thangduongLogicalDevice, &createInfo, nullptr, &thangduongSwapchainImageViews[i]),
              "vkCreateImageView");
    }
}

// ── Render pass ──
void createRenderPass() {
    VkAttachmentDescription color{};
    color.format = thangduongSwapchainFormat;
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

    check(vkCreateRenderPass(thangduongLogicalDevice, &createInfo, nullptr, &thangduongRenderPass), "vkCreateRenderPass");
}

// ── Shaders ──
std::vector<char> readFile(const std::string& path) {
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
    check(vkCreateShaderModule(thangduongLogicalDevice, &createInfo, nullptr, &module), "vkCreateShaderModule");
    return module;
}

void createShaderModules() {
    thangduongVertShader = createShaderModule(readFile("shaders/vert.spv"));
    thangduongFragShader = createShaderModule(readFile("shaders/frag.spv"));
}

// ── Graphics pipeline ──
void createGraphicsPipeline() {
    // Shader: hàm main() của vertex và fragment shader
    VkPipelineShaderStageCreateInfo stages[2]{};
    stages[0].sType = VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO;
    stages[0].stage = VK_SHADER_STAGE_VERTEX_BIT;
    stages[0].module = thangduongVertShader;
    stages[0].pName = "main";
    stages[1].sType = VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO;
    stages[1].stage = VK_SHADER_STAGE_FRAGMENT_BIT;
    stages[1].module = thangduongFragShader;
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
    check(vkCreatePipelineLayout(thangduongLogicalDevice, &layoutInfo, nullptr, &thangduongPipelineLayout), "vkCreatePipelineLayout");

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
    createInfo.layout = thangduongPipelineLayout;
    createInfo.renderPass = thangduongRenderPass;     // pipeline này dùng với render pass nào
    createInfo.subpass = 0;

    check(vkCreateGraphicsPipelines(thangduongLogicalDevice, VK_NULL_HANDLE, 1, &createInfo, nullptr, &thangduongGraphicsPipeline),
          "vkCreateGraphicsPipelines");
}

// ── Framebuffers ──
void createFramebuffers() {
    thangduongFramebuffers.resize(thangduongSwapchainImageViews.size());

    for (size_t i = 0; i < thangduongSwapchainImageViews.size(); i++) {
        VkFramebufferCreateInfo createInfo{};
        createInfo.sType = VK_STRUCTURE_TYPE_FRAMEBUFFER_CREATE_INFO;
        createInfo.renderPass = thangduongRenderPass;
        createInfo.attachmentCount = 1;
        createInfo.pAttachments = &thangduongSwapchainImageViews[i];   // attachment số 0 = ảnh swapchain thứ i
        createInfo.width = thangduongSwapchainExtent.width;
        createInfo.height = thangduongSwapchainExtent.height;
        createInfo.layers = 1;

        check(vkCreateFramebuffer(thangduongLogicalDevice, &createInfo, nullptr, &thangduongFramebuffers[i]), "vkCreateFramebuffer");
    }
}

// ── Command pool + buffer ──
void createCommandBuffer() {
    VkCommandPoolCreateInfo poolInfo{};
    poolInfo.sType = VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO;
    poolInfo.flags = VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT;   // cho phép ghi lại từng buffer
    poolInfo.queueFamilyIndex = thangduongGraphicFamily;                          // buffer sẽ gửi lên graphics queue
    check(vkCreateCommandPool(thangduongLogicalDevice, &poolInfo, nullptr, &thangduongCommandPool), "vkCreateCommandPool");

    VkCommandBufferAllocateInfo allocInfo{};
    allocInfo.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO;
    allocInfo.commandPool = thangduongCommandPool;
    allocInfo.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY;
    allocInfo.commandBufferCount = 1;
    check(vkAllocateCommandBuffers(thangduongLogicalDevice, &allocInfo, &thangduongCommandBuffer), "vkAllocateCommandBuffers");
}

// Gọi mỗi frame từ drawFrame(): ghi lệnh vẽ vào ảnh swapchain số imageIndex
void recordCommandBuffer(VkCommandBuffer cmd, uint32_t imageIndex) {
    VkCommandBufferBeginInfo beginInfo{};
    beginInfo.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO;
    check(vkBeginCommandBuffer(cmd, &beginInfo), "vkBeginCommandBuffer");

    VkClearValue clearColor = {{{0.0f, 0.0f, 0.0f, 1.0f}}};   // nền đen

    VkRenderPassBeginInfo passInfo{};
    passInfo.sType = VK_STRUCTURE_TYPE_RENDER_PASS_BEGIN_INFO;
    passInfo.renderPass = thangduongRenderPass;
    passInfo.framebuffer = thangduongFramebuffers[imageIndex];
    passInfo.renderArea.offset = {0, 0};
    passInfo.renderArea.extent = thangduongSwapchainExtent;
    passInfo.clearValueCount = 1;
    passInfo.pClearValues = &clearColor;

    vkCmdBeginRenderPass(cmd, &passInfo, VK_SUBPASS_CONTENTS_INLINE);
    vkCmdBindPipeline(cmd, VK_PIPELINE_BIND_POINT_GRAPHICS, thangduongGraphicsPipeline);

    VkViewport viewport{};
    viewport.width = static_cast<float>(thangduongSwapchainExtent.width);
    viewport.height = static_cast<float>(thangduongSwapchainExtent.height);
    viewport.maxDepth = 1.0f;
    vkCmdSetViewport(cmd, 0, 1, &viewport);

    VkRect2D scissor{{0, 0}, thangduongSwapchainExtent};
    vkCmdSetScissor(cmd, 0, 1, &scissor);

    vkCmdDraw(cmd, 3, 1, 0, 0);   // 3 đỉnh, 1 thangduongInstance → MỘT TAM GIÁC

    vkCmdEndRenderPass(cmd);
    check(vkEndCommandBuffer(cmd), "vkEndCommandBuffer");
}

// ── Đồng bộ ──
void createSyncObjects() {
    VkSemaphoreCreateInfo semInfo{};
    semInfo.sType = VK_STRUCTURE_TYPE_SEMAPHORE_CREATE_INFO;

    VkFenceCreateInfo fenceInfo{};
    fenceInfo.sType = VK_STRUCTURE_TYPE_FENCE_CREATE_INFO;
    fenceInfo.flags = VK_FENCE_CREATE_SIGNALED_BIT;   // frame đầu tiên không có gì để chờ

    check(vkCreateSemaphore(thangduongLogicalDevice, &semInfo, nullptr, &thangduongImageAvailable), "vkCreateSemaphore");

    thangduongRenderFinished.resize(thangduongSwapchainImages.size());
    for (VkSemaphore& s : thangduongRenderFinished)
        check(vkCreateSemaphore(thangduongLogicalDevice, &semInfo, nullptr, &s), "vkCreateSemaphore");

    check(vkCreateFence(thangduongLogicalDevice, &fenceInfo, nullptr, &thangduongInFlight), "vkCreateFence");
}

// ── drawFrame() ──
void drawFrame() {
    // 0) Chờ GPU vẽ xong frame trước (chuông fence), vì ta sắp ghi đè commandBuffer
    vkWaitForFences(thangduongLogicalDevice, 1, &thangduongInFlight, VK_TRUE, UINT64_MAX);

    // 1) ACQUIRE: xin swapchain một ảnh trống. imageAvailable sẽ bật khi ảnh thật sự rảnh.
    uint32_t imageIndex;
    VkResult result = vkAcquireNextImageKHR(thangduongLogicalDevice, thangduongSwapChain, UINT64_MAX,
                                            thangduongImageAvailable, VK_NULL_HANDLE, &imageIndex);
    if (result != VK_SUCCESS && result != VK_SUBOPTIMAL_KHR)
        check(result, "vkAcquireNextImageKHR");
    vkResetFences(thangduongLogicalDevice, 1, &thangduongInFlight);

    // Ghi lại phiếu việc cho ảnh số imageIndex
    vkResetCommandBuffer(thangduongCommandBuffer, 0);
    recordCommandBuffer(thangduongCommandBuffer, imageIndex);

    // 2) SUBMIT: gửi phiếu lên GPU. Đợi imageAvailable, xong thì bật renderFinished và fence.
    VkPipelineStageFlags waitStage = VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT;
    VkSubmitInfo submitInfo{};
    submitInfo.sType = VK_STRUCTURE_TYPE_SUBMIT_INFO;
    submitInfo.waitSemaphoreCount = 1;
    submitInfo.pWaitSemaphores = &thangduongImageAvailable;
    submitInfo.pWaitDstStageMask = &waitStage;
    submitInfo.commandBufferCount = 1;
    submitInfo.pCommandBuffers = &thangduongCommandBuffer;
    submitInfo.signalSemaphoreCount = 1;
    submitInfo.pSignalSemaphores = &thangduongRenderFinished[imageIndex];
    check(vkQueueSubmit(thangduongGraphicQueue, 1, &submitInfo, thangduongInFlight), "vkQueueSubmit");

    // 3) PRESENT: khi renderFinished bật, đưa ảnh lên màn hình
    VkPresentInfoKHR presentInfo{};
    presentInfo.sType = VK_STRUCTURE_TYPE_PRESENT_INFO_KHR;
    presentInfo.waitSemaphoreCount = 1;
    presentInfo.pWaitSemaphores = &thangduongRenderFinished[imageIndex];
    presentInfo.swapchainCount = 1;
    presentInfo.pSwapchains = &thangduongSwapChain;
    presentInfo.pImageIndices = &imageIndex;
    result = vkQueuePresentKHR(thangduongPresentQueue, &presentInfo);
    if (result != VK_SUCCESS && result != VK_SUBOPTIMAL_KHR)
        check(result, "vkQueuePresentKHR");
}

// ════════════ Dọn dẹp: hủy theo thứ tự ngược lúc tạo ════════════
void cleanup() {
    vkDestroyFence(thangduongLogicalDevice, thangduongInFlight, nullptr);
    for (VkSemaphore s : thangduongRenderFinished)
        vkDestroySemaphore(thangduongLogicalDevice, s, nullptr);
    vkDestroySemaphore(thangduongLogicalDevice, thangduongImageAvailable, nullptr);
    vkDestroyCommandPool(thangduongLogicalDevice, thangduongCommandPool, nullptr);   // giải phóng luôn command buffer
    for (VkFramebuffer fb : thangduongFramebuffers)
        vkDestroyFramebuffer(thangduongLogicalDevice, fb, nullptr);
    vkDestroyPipeline(thangduongLogicalDevice, thangduongGraphicsPipeline, nullptr);
    vkDestroyPipelineLayout(thangduongLogicalDevice, thangduongPipelineLayout, nullptr);
    vkDestroyShaderModule(thangduongLogicalDevice, thangduongFragShader, nullptr);
    vkDestroyShaderModule(thangduongLogicalDevice, thangduongVertShader, nullptr);
    vkDestroyRenderPass(thangduongLogicalDevice, thangduongRenderPass, nullptr);
    for (VkImageView view : thangduongSwapchainImageViews)
        vkDestroyImageView(thangduongLogicalDevice, view, nullptr);
    vkDestroySwapchainKHR(thangduongLogicalDevice, thangduongSwapChain, nullptr);
    vkDestroyDevice(thangduongLogicalDevice, nullptr);
    vkDestroySurfaceKHR(thangduongInstance, thangduongSurface, nullptr);
    vkDestroyInstance(thangduongInstance, nullptr);
    glfwDestroyWindow(thangduongWindow);
    glfwTerminate();
}

int main() {
    try {
        //initWindow();
        thangduongInitWindow();
        thangduongCreateInstance();
        thangduongCreateSurface();
        thangduongPickPhysicalDevice();
        thangduongCreateLogicalDevice();
        createSwapchain();
        createImageViews();
        createRenderPass();
        createShaderModules();
        createGraphicsPipeline();
        createFramebuffers();
        createCommandBuffer();
        createSyncObjects();

        while (!glfwWindowShouldClose(thangduongWindow)) {
            glfwPollEvents();
            drawFrame();
        }
        vkDeviceWaitIdle(thangduongLogicalDevice);   // đợi GPU xong hết việc
        cleanup();
    } catch (const std::exception& e) {
        std::cerr << "Lỗi: " << e.what() << "\n";
        return 1;
    }
    return 0;
}
