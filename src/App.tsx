import { useState } from "react"
import { Routes, Route, useLocation } from "react-router-dom"
import AuthWrapper from "./components/Auth/AuthWrapper"
import Header from "./components/Layout/Header"
import Sidebar from "./components/Layout/Sidebar"
import Dashboard from "./components/Dashboard/Dashboard"
import ProcessList from "./components/Processes/ProcessList"
import ProcessForm from "./components/Processes/ProcessForm"
import ProcessView from "./components/Processes/ProcessView"
import Calendar from "./components/Calendar/Calendar"
import Financial from "./components/Financial/Financial"
import DocumentGenerator from "./components/Documents/DocumentGenerator"
import Reports from "./components/Reports/Reports"
import Settings from "./components/Settings/Settings"
import TeamList from "./components/Team/TeamList"
import LawyerForm from "./components/Team/LawyerForm"
import LawyerView from "./components/Team/LawyerView"
import EmployeeForm from "./components/Team/EmployeeForm"
import EmployeeView from "./components/Team/EmployeeView"
import AdminPage from "./components/Admin/AdminPage"
import InviteAcceptPage from "./components/Admin/InviteAcceptPage"
import type { Process, CalendarEvent } from "./types"
import type { Lawyer, Employee } from "./types"
import type { User } from "./types/auth"
import { authService } from "./services/authService"

function App() {
  const location = useLocation()
  const [activeSection, setActiveSection] = useState("dashboard")
  const [showAdmin, setShowAdmin] = useState(false)
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [teamMemberType, setTeamMemberType] = useState<"lawyer" | "employee">("lawyer")
  const [viewMode, setViewMode] = useState<"list" | "form" | "view">("list")
  const [quickActionType, setQuickActionType] = useState<string | null>(null)

  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error("Erro ao fazer logout:", error)
      window.location.reload()
    }
  }

  const handleSectionChange = (section: string) => {
    setActiveSection(section)
    setShowAdmin(false)
    setViewMode("list")
    setSelectedProcess(null)
    setSelectedEvent(null)
    setSelectedLawyer(null)
    setSelectedEmployee(null)
    setQuickActionType(null)
  }

  const handleOpenAdmin = () => {
    setShowAdmin(true)
    setActiveSection("")
  }

  const handleCloseAdmin = () => {
    setShowAdmin(false)
    setActiveSection("dashboard")
  }
  
  const handleQuickAction = (action: string) => {
    setShowAdmin(false)
    switch (action) {
      case "new-power-of-attorney":
        setActiveSection("documents")
        setQuickActionType("power-of-attorney")
        break
      case "new-receipt":
        setActiveSection("documents")
        setQuickActionType("receipt")
        break
      case "new-revenue":
        setActiveSection("financial")
        setQuickActionType("revenue")
        break
      case "new-expense":
        setActiveSection("financial")
        setQuickActionType("expense")
        break
      case "new-process":
        setActiveSection("processes")
        setViewMode("form")
        setSelectedProcess(null)
        break
      case "new-event":
        setActiveSection("calendar")
        setQuickActionType("event")
        break
      case "new-lawyer":
        setActiveSection("team")
        setViewMode("form")
        setSelectedLawyer(null)
        setTeamMemberType("lawyer")
        break
      case "new-employee":
        setActiveSection("team")
        setViewMode("form")
        setSelectedEmployee(null)
        setTeamMemberType("employee")
        break
    }
  }

  const handleNewProcess = () => {
    setViewMode("form")
    setSelectedProcess(null)
  }

  const handleViewProcess = (process: Process) => {
    setSelectedProcess(process)
    setViewMode("view")
  }

  const handleEditProcess = (process: Process) => {
    setSelectedProcess(process)
    setViewMode("form")
  }

  const handleBackToList = () => {
    setViewMode("list")
    setSelectedProcess(null)
    setSelectedEvent(null)
    setSelectedLawyer(null)
    setSelectedEmployee(null)
    setQuickActionType(null)
  }

  const renderContent = () => {
    if (showAdmin) {
      return <AdminPage onBack={handleCloseAdmin} />
    }

    switch (activeSection) {
      case "dashboard":
        return <Dashboard />

      case "processes":
        switch (viewMode) {
          case "form":
            return <ProcessForm process={selectedProcess} onBack={handleBackToList} onSave={handleBackToList} />
          case "view":
            return (
              <ProcessView
                process={selectedProcess!}
                onBack={handleBackToList}
                onEdit={() => setViewMode("form")}
                onUpdate={(updatedProcess) => {
                  setSelectedProcess(updatedProcess)
                }}
              />
            )
          default:
            return (
              <ProcessList
                onNewProcess={handleNewProcess}
                onViewProcess={handleViewProcess}
                onEditProcess={handleEditProcess}
              />
            )
        }

      case "calendar":
        return <Calendar quickActionType={quickActionType} onClearQuickAction={() => setQuickActionType(null)} />

      case "financial":
        return <Financial quickActionType={quickActionType} onClearQuickAction={() => setQuickActionType(null)} />

      case "documents":
        return (
          <DocumentGenerator quickActionType={quickActionType} onClearQuickAction={() => setQuickActionType(null)} />
        )

      case "reports":
        return <Reports />

      case "settings":
        return <Settings />

      case "team":
        switch (viewMode) {
          case "form":
            if (teamMemberType === "lawyer") {
              return <LawyerForm lawyer={selectedLawyer} onBack={handleBackToList} onSave={handleBackToList} />
            } else {
              return <EmployeeForm employee={selectedEmployee} onBack={handleBackToList} onSave={handleBackToList} />
            }
          case "view":
            if (selectedLawyer) {
              return (
                <LawyerView
                  lawyer={selectedLawyer}
                  onBack={handleBackToList}
                  onEdit={() => {
                    setTeamMemberType("lawyer")
                    setViewMode("form")
                  }}
                  onUpdate={(updatedLawyer) => {
                    setSelectedLawyer(updatedLawyer)
                  }}
                />
              )
            } else if (selectedEmployee) {
              return (
                <EmployeeView
                  employee={selectedEmployee}
                  onBack={handleBackToList}
                  onEdit={() => {
                    setTeamMemberType("employee")
                    setViewMode("form")
                  }}
                  onUpdate={(updatedEmployee) => {
                    setSelectedEmployee(updatedEmployee)
                  }}
                />
              )
            }
            return (
              <TeamList
                onNewLawyer={() => {}}
                onNewEmployee={() => {}}
                onViewLawyer={() => {}}
                onViewEmployee={() => {}}
                onEditLawyer={() => {}}
                onEditEmployee={() => {}}
              />
            )
          default:
            return (
              <TeamList
                onNewLawyer={() => {
                  setViewMode("form")
                  setSelectedLawyer(null)
                  setTeamMemberType("lawyer")
                }}
                onNewEmployee={() => {
                  setViewMode("form")
                  setSelectedEmployee(null)
                  setTeamMemberType("employee")
                }}
                onViewLawyer={(lawyer) => {
                  setSelectedLawyer(lawyer)
                  setViewMode("view")
                }}
                onViewEmployee={(employee) => {
                  setSelectedEmployee(employee)
                  setViewMode("view")
                }}
                onEditLawyer={(lawyer) => {
                  setSelectedLawyer(lawyer)
                  setTeamMemberType("lawyer")
                  setViewMode("form")
                }}
                onEditEmployee={(employee) => {
                  setSelectedEmployee(employee)
                  setTeamMemberType("employee")
                  setViewMode("form")
                }}
              />
            )
        }

      default:
        return <Dashboard />
    }
  }

  const renderApp = (user: User) => (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header user={user} onLogout={handleLogout} onOpenAdmin={handleOpenAdmin} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          onQuickAction={handleQuickAction}
        />
        <main className="flex-1 overflow-auto">{renderContent()}</main>
      </div>
    </div>
  )

  return (
    <Routes>
      {/* ROTA PÚBLICA PARA ACEITAR CONVITES - DEVE FICAR PRIMEIRO */}
      <Route path="/aceitar" element={<InviteAcceptPage />} />
      
      {/* ROTAS PROTEGIDAS POR AUTENTICAÇÃO */}
      <Route path="/*" element={<AuthWrapper>{renderApp}</AuthWrapper>} />
    </Routes>
  )
}

export default App
