const imgReferenceCrop = "https://www.figma.com/api/mcp/asset/c3faa929-7fe3-4dc6-a893-5770310d2bc2.png";
const imgVectorSelectedIconProfile = "https://www.figma.com/api/mcp/asset/04dd4a3d-76c7-42b5-b508-c2e982833ba0.svg";
const imgVectorSidebarIconAccount = "https://www.figma.com/api/mcp/asset/cc7743b2-fcd4-40bb-afaf-ea7f98e566b4.svg";
const imgVectorSidebarIconSecurity = "https://www.figma.com/api/mcp/asset/895b30af-d157-43fc-bc65-3e4d2584a402.svg";
const imgVectorSidebarIconAppearance = "https://www.figma.com/api/mcp/asset/51d94abb-f787-4eb3-8b58-a143efda9c58.svg";
const imgVectorSidebarIconModules = "https://www.figma.com/api/mcp/asset/0da5f5f2-a78e-491d-bf37-8026bb228286.svg";
const imgVectorSidebarIconNotifications = "https://www.figma.com/api/mcp/asset/d515b87e-0ecc-458f-9d7c-b911f05a5a6d.svg";
const imgVectorSidebarIconPrivacy = "https://www.figma.com/api/mcp/asset/495b5014-bd96-465a-84d6-2150aa1c3503.svg";
const imgVectorSidebarIconLanguageRegion = "https://www.figma.com/api/mcp/asset/83333671-9c1f-44df-8891-d33aa684a0c3.svg";
const imgVectorSidebarIconConnections = "https://www.figma.com/api/mcp/asset/9cab3165-436a-485e-a3d7-fd0ece20f16c.svg";
const imgVectorSidebarIconCloudSync = "https://www.figma.com/api/mcp/asset/26b35af3-03d3-4f43-baf1-033ffff12043.svg";
const imgVectorSidebarIconPaymentMethods = "https://www.figma.com/api/mcp/asset/9fa0343b-d41f-4d03-9c30-0c3a34a13cb6.svg";
const imgVectorSidebarIconSubscription = "https://www.figma.com/api/mcp/asset/361271de-b963-473d-be98-7138b44e6244.svg";
const imgVectorSidebarIconDataExport = "https://www.figma.com/api/mcp/asset/d369f09f-c886-49e9-8a0b-64d85634b316.svg";
const imgVectorSidebarIconHelp = "https://www.figma.com/api/mcp/asset/c5153ddc-1d78-4ca3-877c-7ad3980d4cae.svg";
const imgXIcon = "https://www.figma.com/api/mcp/asset/06702923-3c49-4df4-9824-d047a1e5f399.svg";
const imgAvatarRing = "https://www.figma.com/api/mcp/asset/291abd80-b1f3-4a4d-a999-984cbb3e79e8.svg";
const imgCameraIcon = "https://www.figma.com/api/mcp/asset/88eba12d-5eb4-43e6-b171-b604a7285466.svg";
const imgCheckIcon = "https://www.figma.com/api/mcp/asset/4fd18557-a889-490b-aa5d-76b23c9badb5.svg";
const imgMapIcon = "https://www.figma.com/api/mcp/asset/55c20572-3ec8-46e1-8492-f0036920b4d9.svg";
const imgLinkIcon = "https://www.figma.com/api/mcp/asset/9fb16ce0-f25f-44a5-9f42-b3fb4bf53735.svg";
const imgGlobeIcon = "https://www.figma.com/api/mcp/asset/541ecbb0-f776-4f2b-923e-c55a227647ee.svg";
const imgToggle = "https://www.figma.com/api/mcp/asset/3db35690-99a5-4559-b9e1-bcb0bf4b9981.svg";
const imgLinkIcon1 = "https://www.figma.com/api/mcp/asset/43bdc8c9-f461-4326-9557-671438985876.svg";

export default function ProfilePopupPixelReconstruction() {
  return (
    <div className="border border-[#ff1424] border-solid overflow-clip relative rounded-[16px] shadow-[0px_0px_15px_1px_rgba(255,8,23,0.24)] size-full" data-node-id="84:119" data-name="Profile Popup / Pixel reconstruction">
      <div aria-hidden className="absolute bg-black inset-0 pointer-events-none rounded-[16px]" />
      <div className="absolute bg-[var(--surface-primary,#0a0a0a)] h-[960px] left-[-1px] top-[-1px] w-[247px]" data-node-id="84:120" data-name="Sidebar">
        <p className="[word-break:break-word] absolute font-['Inter:Bold'] font-bold leading-[normal] left-[38px] not-italic text-[23px] text-[color:var(--text-primary,#f5f5f5)] top-[31px] whitespace-nowrap" data-node-id="84:121">
          Settings
        </p>
        <div className="absolute bg-[var(--text-disabled,#686868)] h-px left-[20px] top-[78px] w-[219px]" data-node-id="84:122" data-name="Divider" />
        <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal leading-[normal] left-[88px] not-italic text-[14px] text-[color:var(--text-primary,#f5f5f5)] top-[101px] whitespace-nowrap" data-node-id="84:124">
          Account
        </p>
        <div className="absolute bg-[#33090b] border border-[var(--accent,red)] border-solid h-[46px] left-[25px] rounded-[8px] top-[139px] w-[212px]" data-node-id="84:125" data-name="Selected">
          <p className="[word-break:break-word] absolute font-['Inter:Medium'] font-medium leading-[normal] left-[62px] not-italic text-[15px] text-[color:var(--text-primary,#f5f5f5)] top-[12px] whitespace-nowrap" data-node-id="84:127">
            Profile
          </p>
          <div className="absolute left-[18px] size-[23px] top-[12px]" data-node-id="168:122" data-name="Vector selected icon — Profile">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVectorSelectedIconProfile} />
          </div>
        </div>
        <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal leading-[normal] left-[88px] not-italic text-[14px] text-[color:var(--text-primary,#f5f5f5)] top-[205px] whitespace-nowrap" data-node-id="84:129">
          Security
        </p>
        <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal leading-[normal] left-[88px] not-italic text-[14px] text-[color:var(--text-primary,#f5f5f5)] top-[257px] whitespace-nowrap" data-node-id="84:131">
          Appearance
        </p>
        <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal leading-[normal] left-[88px] not-italic text-[14px] text-[color:var(--text-primary,#f5f5f5)] top-[309px] whitespace-nowrap" data-node-id="84:133">
          Modules
        </p>
        <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal leading-[normal] left-[88px] not-italic text-[14px] text-[color:var(--text-primary,#f5f5f5)] top-[361px] whitespace-nowrap" data-node-id="84:135">
          Notifications
        </p>
        <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal leading-[normal] left-[88px] not-italic text-[14px] text-[color:var(--text-primary,#f5f5f5)] top-[413px] whitespace-nowrap" data-node-id="84:137">
          Privacy
        </p>
        <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal leading-[normal] left-[88px] not-italic text-[14px] text-[color:var(--text-primary,#f5f5f5)] top-[465px] whitespace-nowrap" data-node-id="84:139">{`Language & Region`}</p>
        <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal leading-[normal] left-[88px] not-italic text-[14px] text-[color:var(--text-primary,#f5f5f5)] top-[517px] whitespace-nowrap" data-node-id="84:141">
          Connections
        </p>
        <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal leading-[normal] left-[88px] not-italic text-[14px] text-[color:var(--text-primary,#f5f5f5)] top-[569px] whitespace-nowrap" data-node-id="84:143">{`Cloud & Sync`}</p>
        <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal leading-[normal] left-[88px] not-italic text-[14px] text-[color:var(--text-primary,#f5f5f5)] top-[621px] whitespace-nowrap" data-node-id="84:145">
          Payment Methods
        </p>
        <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal leading-[normal] left-[88px] not-italic text-[14px] text-[color:var(--text-primary,#f5f5f5)] top-[673px] whitespace-nowrap" data-node-id="84:147">
          Subscription
        </p>
        <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal leading-[normal] left-[88px] not-italic text-[14px] text-[color:var(--text-primary,#f5f5f5)] top-[725px] whitespace-nowrap" data-node-id="84:149">{`Data & Export`}</p>
        <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal leading-[normal] left-[88px] not-italic text-[14px] text-[color:var(--text-primary,#f5f5f5)] top-[777px] whitespace-nowrap" data-node-id="84:151">
          Help
        </p>
        <div className="absolute left-[38px] size-[24px] top-[98px]" data-node-id="219:163" data-name="Vector sidebar icon — Account">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVectorSidebarIconAccount} />
        </div>
        <div className="absolute left-[38px] size-[24px] top-[202px]" data-node-id="219:166" data-name="Vector sidebar icon — Security">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVectorSidebarIconSecurity} />
        </div>
        <div className="absolute left-[38px] size-[24px] top-[254px]" data-node-id="219:169" data-name="Vector sidebar icon — Appearance">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVectorSidebarIconAppearance} />
        </div>
        <div className="absolute left-[38px] size-[24px] top-[306px]" data-node-id="219:174" data-name="Vector sidebar icon — Modules">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVectorSidebarIconModules} />
        </div>
        <div className="absolute left-[38px] size-[24px] top-[358px]" data-node-id="219:179" data-name="Vector sidebar icon — Notifications">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVectorSidebarIconNotifications} />
        </div>
        <div className="absolute left-[38px] size-[24px] top-[410px]" data-node-id="219:182" data-name="Vector sidebar icon — Privacy">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVectorSidebarIconPrivacy} />
        </div>
        <div className="absolute left-[38px] size-[24px] top-[462px]" data-node-id="219:185" data-name="Vector sidebar icon — Language & Region">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVectorSidebarIconLanguageRegion} />
        </div>
        <div className="absolute left-[38px] size-[24px] top-[514px]" data-node-id="219:188" data-name="Vector sidebar icon — Connections">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVectorSidebarIconConnections} />
        </div>
        <div className="absolute left-[38px] size-[24px] top-[566px]" data-node-id="219:192" data-name="Vector sidebar icon — Cloud & Sync">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVectorSidebarIconCloudSync} />
        </div>
        <div className="absolute left-[38px] size-[24px] top-[618px]" data-node-id="219:194" data-name="Vector sidebar icon — Payment Methods">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVectorSidebarIconPaymentMethods} />
        </div>
        <div className="absolute left-[38px] size-[24px] top-[670px]" data-node-id="219:197" data-name="Vector sidebar icon — Subscription">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVectorSidebarIconSubscription} />
        </div>
        <div className="absolute left-[38px] size-[24px] top-[722px]" data-node-id="219:200" data-name="Vector sidebar icon — Data & Export">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVectorSidebarIconDataExport} />
        </div>
        <div className="absolute left-[38px] size-[24px] top-[774px]" data-node-id="219:203" data-name="Vector sidebar icon — Help">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVectorSidebarIconHelp} />
        </div>
      </div>
      <div className="absolute bg-[var(--background,#050505)] h-[960px] left-[246px] top-[-1px] w-[756px]" data-node-id="84:152" data-name="Content">
        <div className="absolute left-[689px] size-[24px] top-[25px]" data-node-id="272:2396" data-name="x icon">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgXIcon} />
        </div>
        <p className="[word-break:break-word] absolute font-['Inter:Bold'] font-bold leading-[normal] left-[31px] not-italic text-[28px] text-[color:var(--text-primary,#f5f5f5)] top-[80px] whitespace-nowrap" data-node-id="84:154">
          Profile
        </p>
        <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal leading-[normal] left-[31px] not-italic text-[15px] text-[color:var(--text-primary,#f5f5f5)] top-[116px] whitespace-nowrap" data-node-id="84:155">
          Customize your public profile and personal details.
        </p>
        <div className="absolute bg-[var(--surface-primary,#0a0a0a)] border border-[#242424] border-solid h-[186px] left-[31px] rounded-[9px] top-[150px] w-[687px]" data-node-id="84:156" data-name="Media">
          <p className="[word-break:break-word] absolute font-['Inter:Semi_Bold'] font-semibold leading-[normal] left-[14px] not-italic text-[14px] text-[color:var(--text-primary,#f5f5f5)] top-[13px] whitespace-nowrap" data-node-id="84:157">
            Profile Picture
          </p>
          <p className="[word-break:break-word] absolute font-['Inter:Semi_Bold'] font-semibold leading-[normal] left-[359px] not-italic text-[13px] text-[color:var(--text-primary,#f5f5f5)] top-[13px] whitespace-nowrap" data-node-id="84:158">
            Profile Banner
          </p>
          <div className="absolute left-[15px] overflow-clip rounded-[51px] size-[102px] top-[44px]" data-node-id="84:159" data-name="Avatar">
            <div className="absolute h-[960px] left-[-294px] top-[-195px] w-[1003px]" data-node-id="84:160" data-name="Reference crop">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <img alt="" className="absolute h-[113.12%] left-[-22.23%] max-w-none top-[-7.92%] w-[144.37%]" src={imgReferenceCrop} />
              </div>
            </div>
          </div>
          <div className="absolute left-[15px] size-[102px] top-[44px]" data-node-id="84:161" data-name="Avatar ring">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgAvatarRing} />
          </div>
          <div className="absolute bg-[var(--surface-secondary,#101010)] border border-[var(--accent,red)] border-solid left-[81px] rounded-[17px] size-[34px] top-[110px]" data-node-id="84:162" data-name="Camera">
            <div className="absolute left-[9px] size-[15px] top-[8px]" data-node-id="273:3339" data-name="camera icon">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCameraIcon} />
            </div>
          </div>
          <div className="absolute bg-[#3d060a] border border-[var(--accent,red)] border-solid h-[33px] left-[138px] rounded-[7px] top-[71px] w-[105px]" data-node-id="84:164" data-name="Upload Image">
            <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Inter:Medium'] font-medium leading-[normal] left-[51.5px] not-italic text-[12px] text-[color:var(--text-primary,#f5f5f5)] text-center top-[7.5px] w-[105px]" data-node-id="84:165">
              Upload Image
            </p>
          </div>
          <div className="absolute bg-[var(--surface-secondary,#101010)] border border-[#242424] border-solid h-[33px] left-[252px] rounded-[7px] top-[71px] w-[72px]" data-node-id="84:166" data-name="Remove Avatar">
            <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Inter:Medium'] font-medium leading-[normal] left-[35px] not-italic text-[12px] text-[color:var(--text-primary,#f5f5f5)] text-center top-[7.5px] w-[72px]" data-node-id="84:167">
              Remove
            </p>
          </div>
          <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal leading-[normal] left-[138px] not-italic text-[10px] text-[color:var(--text-primary,#f5f5f5)] top-[115px] whitespace-nowrap" data-node-id="84:168">
            JPG, PNG or GIF. Max 5MB.
          </p>
          <div className="absolute h-[68px] left-[359px] overflow-clip rounded-[7px] top-[38px] w-[308px]" data-node-id="84:169" data-name="Banner">
            <div className="absolute h-[960px] left-[-638px] top-[-189px] w-[1003px]" data-node-id="84:170" data-name="Reference crop">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <img alt="" className="absolute h-[113.12%] left-[-22.23%] max-w-none top-[-7.92%] w-[144.37%]" src={imgReferenceCrop} />
              </div>
            </div>
          </div>
          <div className="absolute bg-[#3d060a] border border-[var(--accent,red)] border-solid h-[34px] left-[359px] rounded-[7px] top-[113px] w-[150px]" data-node-id="84:171" data-name="Upload Banner">
            <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Inter:Medium'] font-medium leading-[normal] left-[74px] not-italic text-[12px] text-[color:var(--text-primary,#f5f5f5)] text-center top-[8px] w-[150px]" data-node-id="84:172">
              Upload Banner
            </p>
          </div>
          <div className="absolute bg-[var(--surface-secondary,#101010)] border border-[#242424] border-solid h-[34px] left-[517px] rounded-[7px] top-[113px] w-[150px]" data-node-id="84:173" data-name="Remove Banner">
            <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Inter:Medium'] font-medium leading-[normal] left-[74px] not-italic text-[12px] text-[color:var(--text-primary,#f5f5f5)] text-center top-[8px] w-[150px]" data-node-id="84:174">
              Remove
            </p>
          </div>
          <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal leading-[normal] left-[359px] not-italic text-[9px] text-[color:var(--text-primary,#f5f5f5)] top-[152px] whitespace-nowrap" data-node-id="84:175">
            JPG or PNG. Max 10MB. Recommended 1920 × 480.
          </p>
          <div className="absolute bg-[var(--surface-secondary,#101010)] border border-[var(--accent,red)] border-solid left-[639px] rounded-[17px] size-[34px] top-[87px]" data-node-id="84:176" data-name="Banner camera">
            <div className="absolute left-[9px] size-[15px] top-[8px]" data-node-id="273:3342" data-name="camera icon">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCameraIcon} />
            </div>
          </div>
        </div>
        <p className="[word-break:break-word] absolute font-['Inter:Semi_Bold'] font-semibold leading-[normal] left-[34px] not-italic text-[13px] text-[color:var(--text-primary,#f5f5f5)] top-[358px] whitespace-nowrap" data-node-id="84:178">
          Display Name
        </p>
        <div className="[word-break:break-word] absolute bg-[var(--surface-primary,#0a0a0a)] border border-[#242424] border-solid font-['Inter:Regular'] font-normal h-[43px] leading-[normal] left-[34px] not-italic rounded-[7px] text-[color:var(--text-primary,#f5f5f5)] top-[384px] w-[327px] whitespace-nowrap" data-node-id="84:179" data-name="Display Name">
          <p className="absolute left-[13px] text-[14px] top-[11px]" data-node-id="84:180">
            VEXUM Pro
          </p>
          <p className="absolute left-[281px] text-[10px] top-[11px]" data-node-id="84:181">
            10/32
          </p>
        </div>
        <p className="[word-break:break-word] absolute font-['Inter:Semi_Bold'] font-semibold leading-[normal] left-[384px] not-italic text-[13px] text-[color:var(--text-primary,#f5f5f5)] top-[358px] whitespace-nowrap" data-node-id="84:182">
          Username
        </p>
        <div className="absolute bg-[var(--surface-primary,#0a0a0a)] border border-[#242424] border-solid h-[43px] left-[384px] rounded-[7px] top-[384px] w-[334px]" data-node-id="84:183" data-name="Username">
          <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal leading-[normal] left-[11px] not-italic text-[13px] text-[color:var(--text-primary,#f5f5f5)] top-[11px] whitespace-nowrap" data-node-id="84:184">
            vexum.app/
          </p>
          <p className="[word-break:break-word] absolute font-['Inter:Medium'] font-medium leading-[normal] left-[111px] not-italic text-[13px] text-[color:var(--text-primary,#f5f5f5)] top-[11px] whitespace-nowrap" data-node-id="84:185">
            vexumpro
          </p>
          <div className="absolute left-[298px] size-[15px] top-[11px]" data-node-id="272:2405" data-name="check icon">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCheckIcon} />
          </div>
        </div>
        <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal leading-[normal] left-[384px] not-italic text-[10px] text-[color:var(--text-primary,#f5f5f5)] top-[435px] whitespace-nowrap" data-node-id="84:187">
          This is your unique profile URL.
        </p>
        <p className="[word-break:break-word] absolute font-['Inter:Semi_Bold'] font-semibold leading-[normal] left-[34px] not-italic text-[13px] text-[color:var(--text-primary,#f5f5f5)] top-[463px] whitespace-nowrap" data-node-id="84:188">
          Bio
        </p>
        <div className="[word-break:break-word] absolute bg-[var(--surface-primary,#0a0a0a)] border border-[#242424] border-solid font-['Inter:Regular'] font-normal h-[81px] leading-[normal] left-[34px] not-italic rounded-[7px] text-[color:var(--text-primary,#f5f5f5)] top-[486px] w-[684px] whitespace-nowrap" data-node-id="84:189" data-name="Bio">
          <p className="absolute left-[13px] text-[13px] top-[13px]" data-node-id="84:190">
            Building the future with VEXUM.
          </p>
          <p className="absolute left-[619px] text-[9px] top-[57px]" data-node-id="84:191">
            28/280
          </p>
        </div>
        <p className="[word-break:break-word] absolute font-['Inter:Semi_Bold'] font-semibold leading-[normal] left-[34px] not-italic text-[13px] text-[color:var(--text-primary,#f5f5f5)] top-[589px] whitespace-nowrap" data-node-id="84:192">
          Location
        </p>
        <div className="absolute bg-[var(--surface-primary,#0a0a0a)] border border-[#242424] border-solid h-[47px] left-[34px] rounded-[7px] top-[612px] w-[327px]" data-node-id="84:193" data-name="Location">
          <div className="absolute left-[13px] size-[15px] top-[15px]" data-node-id="272:2732" data-name="map icon">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgMapIcon} />
          </div>
          <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal leading-[normal] left-[53px] not-italic text-[13px] text-[color:var(--text-primary,#f5f5f5)] top-[13px] whitespace-nowrap" data-node-id="84:195">
            New York, USA
          </p>
        </div>
        <p className="[word-break:break-word] absolute font-['Inter:Semi_Bold'] font-semibold leading-[normal] left-[384px] not-italic text-[13px] text-[color:var(--text-primary,#f5f5f5)] top-[589px] whitespace-nowrap" data-node-id="84:196">
          Website
        </p>
        <div className="absolute bg-[var(--surface-primary,#0a0a0a)] border border-[#242424] border-solid h-[47px] left-[384px] rounded-[7px] top-[612px] w-[334px]" data-node-id="84:197" data-name="Website">
          <div className="absolute left-[16px] size-[14px] top-[16px]" data-node-id="273:3345" data-name="link icon">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgLinkIcon} />
          </div>
          <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal leading-[normal] left-[53px] not-italic text-[13px] text-[color:var(--text-primary,#f5f5f5)] top-[13px] whitespace-nowrap" data-node-id="84:199">{`https://vexum.app`}</p>
        </div>
        <div className="absolute bg-[var(--text-disabled,#686868)] h-px left-[34px] top-[678px] w-[684px]" data-node-id="84:200" data-name="Divider" />
        <p className="[word-break:break-word] absolute font-['Inter:Semi_Bold'] font-semibold leading-[normal] left-[34px] not-italic text-[14px] text-[color:var(--text-primary,#f5f5f5)] top-[702px] whitespace-nowrap" data-node-id="84:201">
          Profile Visibility
        </p>
        <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal leading-[normal] left-[34px] not-italic text-[12px] text-[color:var(--text-primary,#f5f5f5)] top-[724px] whitespace-nowrap" data-node-id="84:202">
          Control what others can see on your public profile.
        </p>
        <div className="absolute bg-[var(--surface-primary,#0a0a0a)] border border-[#242424] border-solid h-[120px] left-[34px] rounded-[8px] top-[750px] w-[684px]" data-node-id="84:203" data-name="Visibility Options">
          <div className="absolute left-[21px] size-[15px] top-[21px]" data-node-id="273:3348" data-name="globe icon">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGlobeIcon} />
          </div>
          <p className="[word-break:break-word] absolute font-['Inter:Semi_Bold'] font-semibold leading-[normal] left-[67px] not-italic text-[12px] text-[color:var(--text-primary,#f5f5f5)] top-[10px] whitespace-nowrap" data-node-id="84:205">
            Show location on profile
          </p>
          <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal leading-[normal] left-[67px] not-italic text-[9px] text-[color:var(--text-primary,#f5f5f5)] top-[29px] whitespace-nowrap" data-node-id="84:206">
            Allow others to see your location on your public profile.
          </p>
          <div className="absolute h-[23px] left-[620px] top-[17px] w-[42px]" data-node-id="84:207" data-name="Toggle">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgToggle} />
          </div>
          <div className="absolute bg-[var(--text-disabled,#686868)] h-px left-[-1px] top-[59px] w-[684px]" data-node-id="84:209" data-name="Row line" />
          <div className="absolute left-[22px] size-[15px] top-[81px]" data-node-id="273:3352" data-name="link icon">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgLinkIcon1} />
          </div>
          <p className="[word-break:break-word] absolute font-['Inter:Semi_Bold'] font-semibold leading-[normal] left-[67px] not-italic text-[12px] text-[color:var(--text-primary,#f5f5f5)] top-[70px] whitespace-nowrap" data-node-id="84:211">
            Show website on profile
          </p>
          <p className="[word-break:break-word] absolute font-['Inter:Regular'] font-normal leading-[normal] left-[67px] not-italic text-[9px] text-[color:var(--text-primary,#f5f5f5)] top-[89px] whitespace-nowrap" data-node-id="84:212">
            Display your website link on your public profile.
          </p>
          <div className="absolute h-[23px] left-[620px] top-[77px] w-[42px]" data-node-id="84:213" data-name="Toggle">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgToggle} />
          </div>
        </div>
        <div className="absolute bg-gradient-to-r border border-[var(--accent,red)] border-solid drop-shadow-[0px_0px_8px_rgba(255,10,26,0.34)] from-[#d90a14] h-[41px] left-[542px] rounded-[7px] to-[#d40912] top-[889px] via-[#ff1a2b] via-[52%] w-[176px]" data-node-id="84:215" data-name="Save">
          <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Inter:Medium'] font-medium leading-[normal] left-[87px] not-italic text-[12px] text-[color:var(--text-primary,#f5f5f5)] text-center top-[11.5px] w-[176px]" data-node-id="84:216">
            Save Changes
          </p>
        </div>
      </div>
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_18px_0px_rgba(229,13,31,0.28)]" />
    </div>
  );
}
SUPER CRITICAL: The generated React+Tailwind code MUST be converted to match the target project's technology stack and styling system.
1. Analyze the target codebase to identify: technology stack, styling approach, component patterns, and design tokens
2. Convert React syntax to the target framework/library
3. Transform all Tailwind classes to the target styling system while preserving exact visual design
4. Follow the project's existing patterns and conventions
DO NOT install any Tailwind as a dependency unless the user instructs you to do so.

Node ids have been added to the code as data attributes, e.g. `data-node-id="1:2"`.
Images and SVGs will be stored as constants, e.g. const image = 'https://www.figma.com/api/mcp/asset/550e8400-e29b-41d4-a716-446655440000.png'. These constants will be used in the code as the source for the image, ex: <img src={image} />. Image assets are stored on a remote server for 7 days and can be fetched using the provided URLs until they expire.