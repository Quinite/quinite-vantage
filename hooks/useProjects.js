import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

// Fetch projects
const fetchProjects = async (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.status) params.append('status', filters.status)
    if (filters.page) params.append('page', filters.page)
    if (filters.limit) params.append('limit', filters.limit)
    if (filters.search) params.append('search', filters.search)
    if (filters.archived !== undefined) params.append('archived', filters.archived)

    const res = await fetch(`/api/projects?${params.toString()}`)
    if (!res.ok) throw new Error('Failed to fetch projects')
    return res.json()
}

// ... (fetchProject, createProject, etc. remain the same)

export function useProjects(filters = {}) {
    const query = useQuery({
        queryKey: ['projects', filters],
        queryFn: () => fetchProjects(filters),
        keepPreviousData: true
    })

    // Flatten response for backward compatibility
    // API returns { projects: [], metadata: {} }
    // We return array directly as data, and attach metadata if needed
    const projects = query.data?.projects || []
    const metadata = query.data?.metadata || {}

    return {
        ...query,
        data: projects,
        metadata,
        // Keep original data accessible if needed
        rawData: query.data
    }
}

export function useProject(id) {
    return useQuery({
        queryKey: ['project', id],
        queryFn: () => fetchProject(id),
        enabled: !!id
    })
}

export function useCreateProject() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: createProject,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] })
            toast.success('Project created successfully')
        },
        onError: (error) => {
            toast.error(error.message)
        }
    })
}

export function useUpdateProject() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: updateProject,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['projects'] })
            // Assuming data is { project: ... } or the project object directly
            // Invalidate specific project if we have ID
            // Safe to just invalidate 'projects' list usually
            toast.success('Project updated successfully')
        },
        onError: (error) => {
            toast.error(error.message)
        }
    })
}
